import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '../../../../prisma/generated/prisma/enums';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { HttpAuthGuard } from '../../../shared/guards/http-auth.guard';
import { HttpRolesGuard } from '../../../shared/guards/http-roles.guard';
import { CreatePostInput, UpdatePostInput } from './inputs/post.input';
import { NewsService } from './news.service';

function parseOptionalBoolean(value?: string): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

function parseOptionalTags(value?: string): string[] | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(tag => typeof tag === 'string');
    }
  } catch {
    // Fallback to comma-separated values.
  }

  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

@Controller('news')
@UseGuards(HttpAuthGuard, HttpRolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class NewsImageController {
  constructor(private readonly newsService: NewsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('coverImage'))
  createPost(
    @Body('title') title: string,
    @Body('slug') slug: string,
    @Body('body') body: string,
    @Body('excerpt') excerpt?: string,
    @Body('coverImage') coverImage?: string,
    @Body('isPublished') isPublished?: string,
    @Body('tags') tags?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const input: CreatePostInput = {
      title,
      slug,
      body,
      excerpt,
      coverImage,
      isPublished: parseOptionalBoolean(isPublished),
      tags: parseOptionalTags(tags),
    };

    return this.newsService.createWithImage(input, file);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('coverImage'))
  updatePost(
    @Param('id') id: string,
    @Body('title') title?: string,
    @Body('slug') slug?: string,
    @Body('body') body?: string,
    @Body('excerpt') excerpt?: string,
    @Body('coverImage') coverImage?: string,
    @Body('isPublished') isPublished?: string,
    @Body('tags') tags?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const input: UpdatePostInput = {
      title,
      slug,
      body,
      excerpt,
      coverImage,
      isPublished: parseOptionalBoolean(isPublished),
      tags: parseOptionalTags(tags),
    };

    return this.newsService.updateWithImage(id, input, file);
  }

  @Delete(':id/cover')
  removeCover(@Param('id') id: string) {
    return this.newsService.removeCoverImage(id);
  }
}
