import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductResolver } from './product.resolver';
import { ProductMediaController } from './product-media.controller';
import { PrismaModule } from '../../../core/prisma/prisma.module';
import { RostaSyncService } from './rosta-sync.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductMediaController],
  providers: [ProductResolver, ProductService, RostaSyncService],
  exports: [RostaSyncService],
})
export class ProductModule {}
