import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MailService } from '../libs/mail/mail.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StorageService } from '../libs/storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CronService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
    private readonly notificationService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async deleteDeactivatedAccount() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const deactivatedAccounts = await this.prismaService.user.findMany({
      where: {
        isDeactivated: true,
        deactivatedAt: { lte: sevenDaysAgo },
      },
    });

    for (const user of deactivatedAccounts) {
      await this.mailService.sendAccountDeletion(user.email);
    }

    console.log('deactivatedAccounts: ', deactivatedAccounts);

    await this.prismaService.user.deleteMany({
      where: {
        isDeactivated: true,
        deactivatedAt: { lte: sevenDaysAgo },
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async deteleOldNotitifications() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await this.prismaService.notifications.deleteMany({
      where: { createdAt: { lte: sevenDaysAgo } },
    });
  }
}
