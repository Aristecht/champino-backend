import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  CreateCommentInput,
  CreatePostInput,
  FilterPostInput,
  UpdatePostInput,
} from './inputs/post.input';

@Injectable()
export class NewsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(filter: FilterPostInput, onlyPublished = true) {
    const { search, tag, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (onlyPublished) where.isPublished = true;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const [data, total] = await Promise.all([
      this.prismaService.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        include: { comments: { orderBy: { createdAt: 'asc' } } },
      }),
      this.prismaService.post.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(slug: string, onlyPublished = true) {
    const post = await this.prismaService.post.findUnique({
      where: { slug },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
    if (!post || (onlyPublished && !post.isPublished)) {
      throw new NotFoundException('Новость не найдена');
    }
    return post;
  }

  async create(input: CreatePostInput) {
    const existing = await this.prismaService.post.findUnique({
      where: { slug: input.slug },
    });
    if (existing) {
      throw new BadRequestException('Новость с таким slug уже существует');
    }

    const result = await this.prismaService.post.create({
      data: {
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        body: input.body,
        coverImage: input.coverImage,
        isPublished: input.isPublished ?? false,
        publishedAt: input.isPublished ? new Date() : null,
        tags: input.tags ?? [],
      },
    });

    if (result.isPublished) {
      this.notificationsService.notifyNewPost(result.title).catch(() => {});
    }

    return result;
  }

  async update(id: string, input: UpdatePostInput) {
    const post = await this.prismaService.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Новость не найдена');

    if (input.slug && input.slug !== post.slug) {
      const existing = await this.prismaService.post.findUnique({
        where: { slug: input.slug },
      });
      if (existing) {
        throw new BadRequestException('Новость с таким slug уже существует');
      }
    }

    const publishedAt =
      input.isPublished && !post.isPublished ? new Date() : post.publishedAt;

    const updated = await this.prismaService.post.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.excerpt !== undefined && { excerpt: input.excerpt }),
        ...(input.body !== undefined && { body: input.body }),
        ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
        ...(input.isPublished !== undefined && {
          isPublished: input.isPublished,
        }),
        ...(input.tags !== undefined && { tags: input.tags }),
        publishedAt,
      },
    });

    // Notify on first publish
    if (input.isPublished && !post.isPublished) {
      this.notificationsService.notifyNewPost(updated.title).catch(() => {});
    }

    return updated;
  }

  async remove(id: string) {
    const post = await this.prismaService.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Новость не найдена');
    await this.prismaService.post.delete({ where: { id } });
    return true;
  }

  // ─── COMMENTS ─────────────────────────────────────────────────────────────

  async addComment(postId: string, userId: string, input: CreateCommentInput) {
    const post = await this.prismaService.post.findUnique({
      where: { id: postId },
    });
    if (!post || !post.isPublished)
      throw new NotFoundException('Новость не найдена');

    return this.prismaService.articleComment.create({
      data: { body: input.body, postId, userId },
    });
  }

  async deleteComment(commentId: string, userId: string, isAdmin = false) {
    const comment = await this.prismaService.articleComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Комментарий не найден');
    if (!isAdmin && comment.userId !== userId) {
      throw new BadRequestException('Нет доступа к этому комментарию');
    }
    await this.prismaService.articleComment.delete({
      where: { id: commentId },
    });
    return true;
  }
}
