import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateProductInput } from './inputs/create-product.input';
import { UpdateProductInput } from './inputs/update-product.input';
import { FilterProductInput } from './inputs/filter-product.input';
import { CreateDraftProductInput } from './inputs/create-draft-product.input';
import { Prisma } from '../../../../prisma/generated/prisma/client';
import { StorageService } from '../../libs/storage/storage.service';
import { MediaType } from '../../../../prisma/generated/prisma/enums';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProductService {
  private static readonly MAX_IMAGES = 10;
  private static readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  private static readonly MAX_VIDEO_SIZE = 200 * 1024 * 1024;
  private static readonly ALLOWED_IMAGE_EXTS = [
    'jpg',
    'jpeg',
    'png',
    'webp',
    'gif',
  ];
  private static readonly ALLOWED_VIDEO_EXTS = ['mp4', 'webm', 'mov'];

  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(filter: FilterProductInput) {
    const {
      search,
      categoryId,
      minPrice,
      maxPrice,
      inStock,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const skip = (page - 1) * limit;

    const where: any = { isPublished: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (inStock === true) {
      where.stock = { gt: 0 };
    }

    const allowedSortFields = ['price', 'name', 'createdAt'];
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      allowedSortFields.includes(sortBy)
        ? { [sortBy]: sortOrder as Prisma.SortOrder }
        : { createdAt: Prisma.SortOrder.desc };

    const [products, total] = await Promise.all([
      this.prismaService.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          medias: true,
        },
      }),
      this.prismaService.product.count({ where }),
    ]);

    return {
      data: products,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAllAdmin(filter: FilterProductInput) {
    const {
      search,
      categoryId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;

    const allowedSortFields = ['price', 'name', 'createdAt'];
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      allowedSortFields.includes(sortBy)
        ? { [sortBy]: sortOrder as Prisma.SortOrder }
        : { createdAt: Prisma.SortOrder.desc };

    const [products, total] = await Promise.all([
      this.prismaService.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          medias: true,
        },
      }),
      this.prismaService.product.count({ where }),
    ]);

    return {
      data: products,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const product = await this.prismaService.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        medias: true,
      },
    });

    if (!product) throw new NotFoundException('Товар не найден');

    return product;
  }

  async create(input: CreateProductInput) {
    const {
      draftId,
      name,
      categoryId,
      price,
      stock,
      attributes,
      isPublished = true,
      description,
      discountPercent,
    } = input;

    const draft = await this.prismaService.product.findUnique({
      where: { id: draftId },
    });
    if (!draft) throw new NotFoundException('Черновик не найден');
    if (!draft.isDraft) throw new BadRequestException('Товар уже создан');

    const category = await this.prismaService.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Категория не найдена');

    return this.prismaService.product.update({
      where: { id: draftId },
      data: {
        name,
        description,
        price,
        stock: stock ?? 0,
        category: { connect: { id: categoryId } },
        attributes: attributes as Prisma.InputJsonValue,
        isPublished: isPublished ?? true,
        isDraft: false,
        discountPercent: discountPercent ?? 0,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        medias: true,
      },
    });
  }

  async createDraft() {
    return this.prismaService.product.create({
      data: { isDraft: true, isPublished: false },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        medias: true,
      },
    });
  }

  async update(id: string, input: UpdateProductInput) {
    await this.findOne(id);

    if (input.categoryId) {
      const category = await this.prismaService.category.findUnique({
        where: { id: input.categoryId },
      });
      if (!category) throw new NotFoundException('Категория не найдена');
    }

    return this.prismaService.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.stock !== undefined && { stock: input.stock }),
        ...(input.categoryId !== undefined && {
          category: { connect: { id: input.categoryId } },
        }),
        ...(input.attributes !== undefined && {
          attributes: input.attributes as Prisma.InputJsonValue,
        }),
        ...(input.isPublished !== undefined && {
          isPublished: input.isPublished,
        }),
        ...(input.discountPercent !== undefined && {
          discountPercent: input.discountPercent,
        }),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        medias: true,
      },
    });
  }

  async remove(id: string) {
    const product = await this.prismaService.product.findUnique({
      where: { id },
      include: { medias: true },
    });
    if (!product) throw new NotFoundException('Товар не найден');

    await Promise.all(
      product.medias.map(media => {
        const url = new URL(media.url);
        const key = url.pathname.replace(/^\/[^/]+\//, '');
        return this.storageService.remove(key);
      }),
    );

    await this.prismaService.product.delete({ where: { id } });
    return true;
  }

  async togglePublish(id: string) {
    const product = await this.findOne(id);
    return this.prismaService.product.update({
      where: { id },
      data: { isPublished: !product.isPublished },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        medias: true,
      },
    });
  }

  async uploadImages(productId: string, files: Express.Multer.File[]) {
    await this.findOne(productId);

    if (!files || files.length === 0) {
      throw new BadRequestException('Файлы не переданы');
    }

    const existingCount = await this.prismaService.media.count({
      where: { productId, mediaType: MediaType.IMAGE },
    });

    if (existingCount + files.length > ProductService.MAX_IMAGES) {
      throw new BadRequestException(
        `Максимум ${ProductService.MAX_IMAGES} изображений. Сейчас загружено: ${existingCount}`,
      );
    }

    const results = [];
    for (const file of files) {
      const ext = extname(file.originalname).replace('.', '').toLowerCase();
      if (!ProductService.ALLOWED_IMAGE_EXTS.includes(ext)) {
        throw new BadRequestException(
          `Недопустимый формат изображения: ${ext}. Разрешены: ${ProductService.ALLOWED_IMAGE_EXTS.join(', ')}`,
        );
      }
      if (file.size > ProductService.MAX_IMAGE_SIZE) {
        throw new BadRequestException(
          `Размер файла ${file.originalname} превышает ${ProductService.MAX_IMAGE_SIZE / 1024 / 1024} МБ`,
        );
      }

      const key = `products/${productId}/images/${uuidv4()}.${ext}`;
      await this.storageService.upload(file.buffer, key, file.mimetype);
      const url = this.storageService.getFileUrl(key);

      const media = await this.prismaService.media.create({
        data: { url, mediaType: MediaType.IMAGE, productId },
      });
      results.push(media);
    }

    return results;
  }

  async uploadVideo(productId: string, file: Express.Multer.File) {
    await this.findOne(productId);

    if (!file) {
      throw new BadRequestException('Файл не передан');
    }

    const existingVideo = await this.prismaService.media.findFirst({
      where: { productId, mediaType: MediaType.VIDEO },
    });
    if (existingVideo) {
      throw new BadRequestException(
        'У товара уже есть видео. Сначала удалите текущее.',
      );
    }

    const ext = extname(file.originalname).replace('.', '').toLowerCase();
    if (!ProductService.ALLOWED_VIDEO_EXTS.includes(ext)) {
      throw new BadRequestException(
        `Недопустимый формат видео: ${ext}. Разрешены: ${ProductService.ALLOWED_VIDEO_EXTS.join(', ')}`,
      );
    }
    if (file.size > ProductService.MAX_VIDEO_SIZE) {
      throw new BadRequestException(
        `Размер файла ${file.originalname} превышает ${ProductService.MAX_VIDEO_SIZE / 1024 / 1024} МБ`,
      );
    }

    const key = `products/${productId}/videos/${uuidv4()}.${ext}`;
    await this.storageService.upload(file.buffer, key, file.mimetype);
    const url = this.storageService.getFileUrl(key);

    return this.prismaService.media.create({
      data: { url, mediaType: MediaType.VIDEO, productId },
    });
  }

  async removeMedia(productId: string, mediaId: string) {
    const media = await this.prismaService.media.findFirst({
      where: { id: mediaId, productId },
    });
    if (!media) throw new NotFoundException('Медиафайл не найден');

    const url = new URL(media.url);
    const key = url.pathname.replace(/^\/[^/]+\//, '');

    await this.storageService.remove(key);
    await this.prismaService.media.delete({ where: { id: mediaId } });

    return true;
  }

  // ─── VARIANTS ─────────────────────────────────────────────────────────────

  async getVariants(productId: string) {
    await this.findOne(productId);
    return this.prismaService.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createVariant(
    productId: string,
    input: {
      sku: string;
      name: string;
      price?: number;
      stock?: number;
      attributes?: string;
    },
  ) {
    await this.findOne(productId);

    const existingSku = await this.prismaService.productVariant.findUnique({
      where: { sku: input.sku },
    });
    if (existingSku)
      throw new BadRequestException(`SKU "${input.sku}" уже используется`);

    return this.prismaService.productVariant.create({
      data: {
        productId,
        sku: input.sku,
        name: input.name,
        price: input.price,
        stock: input.stock ?? 0,
        attributes: input.attributes ? JSON.parse(input.attributes) : undefined,
      },
    });
  }

  async updateVariant(
    variantId: string,
    input: {
      sku?: string;
      name?: string;
      price?: number;
      stock?: number;
      attributes?: string;
      isActive?: boolean;
    },
  ) {
    const variant = await this.prismaService.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new NotFoundException('Вариант не найден');

    if (input.sku && input.sku !== variant.sku) {
      const existingSku = await this.prismaService.productVariant.findUnique({
        where: { sku: input.sku },
      });
      if (existingSku)
        throw new BadRequestException(`SKU "${input.sku}" уже используется`);
    }

    return this.prismaService.productVariant.update({
      where: { id: variantId },
      data: {
        ...(input.sku !== undefined && { sku: input.sku }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.stock !== undefined && { stock: input.stock }),
        ...(input.attributes !== undefined && {
          attributes: JSON.parse(input.attributes),
        }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
  }

  async deleteVariant(variantId: string) {
    const variant = await this.prismaService.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new NotFoundException('Вариант не найден');
    await this.prismaService.productVariant.delete({
      where: { id: variantId },
    });
    return true;
  }
}
