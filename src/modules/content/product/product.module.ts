import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductResolver } from './product.resolver';
import { ProductMediaController } from './product-media.controller';
import { PrismaModule } from '../../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductMediaController],
  providers: [ProductResolver, ProductService],
})
export class ProductModule {}
