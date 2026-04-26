import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
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
  constructor(private readonly prismaService: PrismaService) {}

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

    if (existing) {
      throw new ConflictException(
        'Категория с таким именем или slug уже существует',
      );
    }

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

    if (input.slug || input.name) {
      const conflict = await this.prismaService.category.findFirst({
        where: {
          OR: [
            input.name ? { name: input.name } : undefined,
            input.slug ? { slug: input.slug } : undefined,
          ].filter(Boolean),
          NOT: { id },
        },
      });

      if (conflict) {
        throw new ConflictException('Имя или slug уже заняты');
      }
    }

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
}
