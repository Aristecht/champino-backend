import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoryService } from './category.service';
import { HttpAuthGuard } from '../../../shared/guards/http-auth.guard';
import { HttpRolesGuard } from '../../../shared/guards/http-roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { Role } from '../../../../prisma/generated/prisma/enums';

@Controller('categories')
@UseGuards(HttpAuthGuard, HttpRolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class CategoryImageController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body('name') name: string,
    @Body('slug') slug?: string,
    @Body('parentId') parentId?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.categoryService.createWithImage({ name, slug, parentId }, file);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoryService.uploadImage(id, file);
  }

  @Delete(':id/image')
  removeImage(@Param('id') id: string) {
    return this.categoryService.removeImage(id);
  }
}
