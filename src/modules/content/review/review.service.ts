import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateReviewInput } from './inputs/create-review.input';
import { UpdateReviewInput } from './inputs/update-review.input';
import { OrderStatus, Role } from '../../../../prisma/generated/prisma/enums';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getProductReviews(productId: string, page = 1, limit = 10) {
    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.max(1, Math.min(limit, 100));

    const [reviews, total, ratingAgg] = await this.prismaService.$transaction([
      this.prismaService.review.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip: (normalizedPage - 1) * normalizedLimit,
        take: normalizedLimit,
      }),
      this.prismaService.review.count({
        where: { productId },
      }),
      this.prismaService.review.aggregate({
        where: { productId },
        _avg: { rating: true },
      }),
    ]);

    const avgRating = total > 0 ? Number(ratingAgg._avg.rating ?? 0) : 0;

    return {
      data: reviews,
      total,
      avgRating,
      page: normalizedPage,
      limit: normalizedLimit,
    };
  }

  async createReview(userId: string, input: CreateReviewInput) {
    const product = await this.prismaService.product.findUnique({
      where: { id: input.productId },
    });
    if (!product || !product.isPublished) {
      throw new NotFoundException('Товар не найден');
    }

    const existing = await this.prismaService.review.findUnique({
      where: { userId_productId: { userId, productId: input.productId } },
    });
    if (existing) {
      throw new BadRequestException('Вы уже оставляли отзыв на этот товар');
    }

    const purchased = await this.prismaService.orderItem.findFirst({
      where: {
        productId: input.productId,
        order: {
          userId,
          status: {
            in: [
              OrderStatus.PROCESSING,
              OrderStatus.ASSEMBLING,
              OrderStatus.READY_FOR_PICKUP,
              OrderStatus.IN_TRANSIT,
              OrderStatus.DELIVERED,
              OrderStatus.COMPLETED,
            ],
          },
        },
      },
    });

    const review = await this.prismaService.review.create({
      data: {
        userId,
        productId: input.productId,
        rating: input.rating,
        title: input.title,
        text: input.text,
        isVerified: !!purchased,
      },
    });

    await this.recalcProductRating(input.productId);

    return review;
  }

  async updateReview(
    userId: string,
    reviewId: string,
    input: UpdateReviewInput,
  ) {
    const review = await this.prismaService.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Отзыв не найден');
    if (review.userId !== userId) throw new ForbiddenException();

    const updated = await this.prismaService.review.update({
      where: { id: reviewId },
      data: {
        rating: input.rating ?? review.rating,
        title: input.title,
        text: input.text,
      },
    });

    await this.recalcProductRating(review.productId);

    return updated;
  }

  async deleteReview(userId: string, reviewId: string, role: Role) {
    const review = await this.prismaService.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Отзыв не найден');

    const isAdmin = role === Role.ADMIN || role === Role.MANAGER;
    if (!isAdmin && review.userId !== userId) throw new ForbiddenException();

    await this.prismaService.review.delete({ where: { id: reviewId } });
    await this.recalcProductRating(review.productId);

    return true;
  }

  // ─── PRIVATE ──────────────────────────────────────────────────────────────

  private async recalcProductRating(productId: string) {
    const agg = await this.prismaService.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { id: true },
    });

    await this.prismaService.product.update({
      where: { id: productId },
      data: {
        avgRating: agg._avg.rating ?? 0,
        reviewCount: agg._count.id,
      },
    });
  }
}
