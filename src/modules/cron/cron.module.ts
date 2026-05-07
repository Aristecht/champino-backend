import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../libs/mail/mail.module';
import { ProductModule } from '../content/product/product.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule, MailModule, ProductModule],
  providers: [CronService],
})
export class CronModule {}
