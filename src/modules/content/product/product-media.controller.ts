import {
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { HttpAuthGuard } from '../../../shared/guards/http-auth.guard';
import { HttpRolesGuard } from '../../../shared/guards/http-roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { Role } from '../../../../prisma/generated/prisma/enums';

@Controller('products')
@UseGuards(HttpAuthGuard, HttpRolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class ProductMediaController {
  constructor(private readonly productService: ProductService) {}
  @Post(':id/media/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productService.uploadImages(id, files);
  }

  @Post(':id/media/video')
  @UseInterceptors(FileInterceptor('video'))
  uploadVideo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productService.uploadVideo(id, file);
  }

  @Delete(':id/media/:mediaId')
  removeMedia(@Param('id') id: string, @Param('mediaId') mediaId: string) {
    return this.productService.removeMedia(id, mediaId);
  }
}
