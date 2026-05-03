import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { StorageService } from '../../libs/storage/storage.service';
import {
  CreateCommentInput,
  CreatePostInput,
  FilterPostInput,
  UpdatePostInput,
} from './inputs/post.input';

@Injectable()
export class NewsService {
  private static readonly ALLOWED_IMAGE_EXTS = [
    'jpg',
    'jpeg',
    'png',
    'webp',
    'gif',
  ];
  private static readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}

  private validateCoverImage(file: Express.Multer.File) {
    const ext = extname(file.originalname).replace('.', '').toLowerCase();

    if (!NewsService.ALLOWED_IMAGE_EXTS.includes(ext)) {
      throw new BadRequestException(
        `Недопустимый формат: ${ext}. Разрешены: ${NewsService.ALLOWED_IMAGE_EXTS.join(', ')}`,
      );
    }

    if (file.size > NewsService.MAX_IMAGE_SIZE) {
      throw new BadRequestException(
        `Размер файла превышает ${NewsService.MAX_IMAGE_SIZE / 1024 / 1024} МБ`,
      );
    }

    return ext;
  }

  private async removeCoverIfExists(url?: string | null) {
    if (!url) {
      return;
    }

    const key = url.split(`/${process.env.S3_BUCKET_NAME}/`)[1];
    if (key) {
      await this.storageService.remove(key);
    }
  }

  async createWithImage(input: CreatePostInput, file?: Express.Multer.File) {
    let coverImage = input.coverImage;

    if (file) {
      const ext = this.validateCoverImage(file);
      const key = `news/${uuidv4()}.${ext}`;
      await this.storageService.upload(file.buffer, key, file.mimetype);
      coverImage = this.storageService.getFileUrl(key);
    }

    return this.create({
      ...input,
      coverImage,
    });
  }

  async updateWithImage(
    id: string,
    input: UpdatePostInput,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      return this.update(id, input);
    }

    const post = await this.prismaService.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Новость не найдена');
    }

    const ext = this.validateCoverImage(file);
    const key = `news/${uuidv4()}.${ext}`;
    await this.storageService.upload(file.buffer, key, file.mimetype);
    const newCoverUrl = this.storageService.getFileUrl(key);

    const updated = await this.update(id, {
      ...input,
      coverImage: newCoverUrl,
    });

    if (post.coverImage && post.coverImage !== newCoverUrl) {
      this.removeCoverIfExists(post.coverImage).catch(() => {});
    }

    return updated;
  }

  async removeCoverImage(id: string) {
    const post = await this.prismaService.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Новость не найдена');
    }

    if (!post.coverImage) {
      throw new BadRequestException('У новости нет обложки');
    }

    await this.removeCoverIfExists(post.coverImage);

    return this.prismaService.post.update({
      where: { id },
      data: { coverImage: null },
    });
  }

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

    await this.removeCoverIfExists(post.coverImage);

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
