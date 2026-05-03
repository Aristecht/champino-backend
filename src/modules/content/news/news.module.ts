import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsResolver } from './news.resolver';
import { PrismaModule } from '../../../core/prisma/prisma.module';
import { NewsImageController } from './news-image.controller';

@Module({
  imports: [PrismaModule],
  controllers: [NewsImageController],
  providers: [NewsResolver, NewsService],
})
export class NewsModule {}
