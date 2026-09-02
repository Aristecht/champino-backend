import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsResolver } from './news.resolver';
import { PrismaModule } from '../../../core/prisma/prisma.module';
import { NewsImageController } from './news-image.controller';
import { NotificationsModule } from '../../notifications/notifications.module';
import { StorageModule } from '../../libs/storage/storage.module';

@Module({
  imports: [PrismaModule, NotificationsModule, StorageModule],
  controllers: [NewsImageController],
  providers: [NewsResolver, NewsService],
})
export class NewsModule {}
