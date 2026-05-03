import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { StorageService } from '../../libs/storage/storage.service';
import { CreateCategoryInput } from './inputs/create-category.input';
import { UpdateCategoryInput } from './inputs/update-category.input';

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .split('')
    .map(ch => CYRILLIC_MAP[ch] ?? ch)
    .join('')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class CategoryService {
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
    private readonly storageService: StorageService,
  ) {}

  async findAll() {
    return this.prismaService.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prismaService.category.findUnique({
      where: { id },
      include: {
        children: {
          include: { children: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prismaService.category.findUnique({
      where: { slug },
      include: {
        children: {
          include: { children: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    return category;
  }

  async create(input: CreateCategoryInput) {
    const { name, imageUrl, parentId } = input;
    const slug = input.slug ? input.slug : toSlug(name);

    const existing = await this.prismaService.category.findFirst({
      where: { OR: [{ name }, { slug }] },
    });

    if (parentId) {
      const parent = await this.prismaService.category.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        throw new NotFoundException('Родительская категория не найдена');
      }

      if (parent.parentId) {
        throw new ConflictException(
          'Нельзя создать подкатегорию третьего уровня',
        );
      }
    }

    return this.prismaService.category.create({
      data: { name, slug, imageUrl, parentId },
      include: { children: true },
    });
  }

  async update(id: string, input: UpdateCategoryInput) {
    await this.findOne(id);

    return this.prismaService.category.update({
      where: { id },
      data: input,
      include: { children: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prismaService.category.delete({ where: { id } });

    return true;
  }

  async createWithImage(
    input: { name: string; slug?: string; parentId?: string },
    file?: Express.Multer.File,
  ) {
    const { name, parentId } = input;
    const slug = input.slug ? input.slug : toSlug(name);

    if (parentId) {
      const parent = await this.prismaService.category.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundException('Родительская категория не найдена');
      }
      if (parent.parentId) {
        throw new ConflictException(
          'Нельзя создать подкатегорию третьего уровня',
        );
      }
    }

    if (file && !parentId) {
      const ext = extname(file.originalname).replace('.', '').toLowerCase();
      if (!CategoryService.ALLOWED_IMAGE_EXTS.includes(ext)) {
        throw new BadRequestException(
          `Недопустимый формат: ${ext}. Разрешены: ${CategoryService.ALLOWED_IMAGE_EXTS.join(', ')}`,
        );
      }
      if (file.size > CategoryService.MAX_IMAGE_SIZE) {
        throw new BadRequestException(
          `Размер файла превышает ${CategoryService.MAX_IMAGE_SIZE / 1024 / 1024} МБ`,
        );
      }
    }

    const category = await this.prismaService.category.create({
      data: { name, slug, parentId },
      include: { children: true },
    });

    if (file && !parentId) {
      const ext = extname(file.originalname).replace('.', '').toLowerCase();
      const key = `categories/${category.id}/${uuidv4()}.${ext}`;
      await this.storageService.upload(file.buffer, key, file.mimetype);
      const imageUrl = this.storageService.getFileUrl(key);
      return this.prismaService.category.update({
        where: { id: category.id },
        data: { imageUrl },
        include: { children: true },
      });
    }

    return category;
  }

  async uploadImage(id: string, file: Express.Multer.File) {
    const category = await this.findOne(id);

    if (category.parentId) {
      throw new BadRequestException(
        'Изображения можно загружать только для родительских категорий',
      );
    }

    const ext = extname(file.originalname).replace('.', '').toLowerCase();
    if (!CategoryService.ALLOWED_IMAGE_EXTS.includes(ext)) {
      throw new BadRequestException(
        `Недопустимый формат: ${ext}. Разрешены: ${CategoryService.ALLOWED_IMAGE_EXTS.join(', ')}`,
      );
    }
    if (file.size > CategoryService.MAX_IMAGE_SIZE) {
      throw new BadRequestException(
        `Размер файла превышает ${CategoryService.MAX_IMAGE_SIZE / 1024 / 1024} МБ`,
      );
    }

    if (category.imageUrl) {
      const oldKey = category.imageUrl.split(
        `/${process.env.S3_BUCKET_NAME}/`,
      )[1];
      if (oldKey) await this.storageService.remove(oldKey);
    }

    const key = `categories/${id}/${uuidv4()}.${ext}`;
    await this.storageService.upload(file.buffer, key, file.mimetype);
    const imageUrl = this.storageService.getFileUrl(key);

    return this.prismaService.category.update({
      where: { id },
      data: { imageUrl },
      include: { children: true },
    });
  }

  async removeImage(id: string) {
    const category = await this.findOne(id);

    if (!category.imageUrl) {
      throw new BadRequestException('У категории нет изображения');
    }

    const key = category.imageUrl.split(`/${process.env.S3_BUCKET_NAME}/`)[1];
    if (key) await this.storageService.remove(key);

    return this.prismaService.category.update({
      where: { id },
      data: { imageUrl: null },
      include: { children: true },
    });
  }
}
