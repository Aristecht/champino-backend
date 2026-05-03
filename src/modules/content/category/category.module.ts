import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryResolver } from './category.resolver';
import { CategoryImageController } from './category-image.controller';

@Module({
  controllers: [CategoryImageController],
  providers: [CategoryService, CategoryResolver],
})
export class CategoryModule {}
