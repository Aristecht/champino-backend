import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  NotificationsType,
  type User,
} from '../../../prisma/generated/prisma/client';
import { ChangeNotificationsSettingsInput } from './inputs/change-notifications-settings.input';
import { PageLimitInput } from './inputs/page-limit.input';
import { FirebaseService } from '../../core/firebase/firebase.service';
import { RegisterDeviceTokenInput } from './inputs/register-device-token.input';

export interface CreateNotificationData {
  userId: string;
  type: NotificationsType;
  message: string;
  actorId?: string;
  projectId?: string;
  albumId?: string;
  commentId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly firebaseService: FirebaseService,
  ) {}

  private async createNotification(data: CreateNotificationData) {
    if (data.userId === data.actorId) {
      return null;
    }

    const settings = await this.prismaService.notificationsSettings.findUnique({
      where: { userId: data.userId },
    });

    if (settings && !settings.siteNotifications) {
      return null;
    }

    const notification = await this.prismaService.notifications.create({
      data,
    });

    if (settings?.pushNotifications !== false) {
      await this.sendPushNotification(data.userId, {
        title: this.getNotificationTitle(data.type),
        body: data.message,
        data: {
          type: data.type,
          notificationId: notification.id,
          projectId: data.projectId || '',
          actorId: data.actorId || '',
        },
      });
    }

    return notification;
  }

  async findUnreadCount(user: User) {
    const count = await this.prismaService.notifications.count({
      where: { isRead: false, userId: user.id },
    });

    return count;
  }

  async findByUser(user: User, input: PageLimitInput) {
    const { limit = 20, page = 1 } = input;

    const skip = (page - 1) * limit;

    await this.prismaService.notifications.updateMany({
      where: { isRead: false, userId: user.id },
      data: {
        isRead: true,
      },
    });

    const [notifications, total] = await Promise.all([
      await this.prismaService.notifications.findMany({
        where: {
          userId: user.id,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: true,
        },
      }),
      await this.prismaService.notifications.count({
        where: { userId: user.id },
      }),
    ]);

    return {
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(user: User, notificationIds: string[]) {
    await this.prismaService.notifications.updateMany({
      where: { id: { in: notificationIds }, userId: user.id },
      data: { isRead: true },
    });

    return true;
  }

  async markAllAsRead(user: User) {
    await this.prismaService.notifications.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return true;
  }

  async changeSettings(user: User, input: ChangeNotificationsSettingsInput) {
    const { siteNotifications, pushNotifications } = input;

    const notificationSettings =
      await this.prismaService.notificationsSettings.upsert({
        where: { userId: user.id },
        create: {
          siteNotifications,
          pushNotifications,
          userId: user.id,
        },
        update: {
          siteNotifications,
          pushNotifications,
        },
        include: { user: true },
      });

    return { notificationSettings };
  }

  private getNotificationTitle(type: NotificationsType): string {
    const titles: Record<string, string> = {
      [NotificationsType.ENABLE_TWO_FACTOR]: '🔒 2FA включена',
      [NotificationsType.DISABLE_TWO_FACTOR]: '🔓 2FA отключена',
      // Shop
      [NotificationsType.ORDER_PLACED]: '🛒 Заказ оформлен',
      [NotificationsType.ORDER_PAID]: '💳 Заказ оплачен',
      [NotificationsType.ORDER_CONFIRMED]: '✅ Заказ подтверждён',
      [NotificationsType.ORDER_SHIPPED]: '🚚 Заказ отправлен',
      [NotificationsType.ORDER_DELIVERED]: '📦 Заказ доставлен',
      [NotificationsType.ORDER_CANCELLED]: '❌ Заказ отменён',
      [NotificationsType.ORDER_REFUNDED]: '💰 Возврат средств',
      [NotificationsType.ORDER_STATUS_CHANGED]: '🔄 Статус заказа изменён',
      [NotificationsType.NEW_POST]: '📰 Новая статья',
      [NotificationsType.POST_COMMENT]: '💬 Комментарий к статье',
    };

    return titles[type] || 'Уведомление';
  }

  private async sendPushNotification(
    userId: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ) {
    try {
      const deviceTokens = await this.prismaService.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });

      if (deviceTokens.length === 0) {
        console.log(`[Push] No device tokens for user ${userId}, skipping`);
        return;
      }

      const tokens = deviceTokens.map(t => t.token);
      console.log(`[Push] Sending to user ${userId}, tokens: ${tokens.length}`);

      const response = await this.firebaseService.sendToMultipleDevice(
        tokens,
        notification,
      );

      if (response.failureCount > 0) {
        // remove invalid/unregistered tokens
        const toRemove: string[] = [];

        response.responses.forEach((resp, index) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            console.log(`Failed to send to ${tokens[index]}: ${resp.error}`);
            if (
              errCode === 'messaging/registration-token-not-registered' ||
              errCode === 'messaging/invalid-registration-token' ||
              errCode === 'messaging/registration-token-not-registered'
            ) {
              toRemove.push(tokens[index]);
            }
          }
        });

        if (toRemove.length > 0) {
          try {
            await this.prismaService.deviceToken.deleteMany({
              where: { token: { in: toRemove } },
            });
            console.log(`[Push] Removed ${toRemove.length} invalid tokens`);
          } catch (err) {
            console.error('[Push] Failed to remove invalid tokens', err);
          }
        }
      }

      console.log(`[Push] ✅ Sent to user ${userId}`);
    } catch (error) {
      console.error(
        `Failed to send push notification to user ${userId}`,
        error,
      );
    }
  }

  async registerDeviceToken(user: User, input: RegisterDeviceTokenInput) {
    const { token, deviceType, deviceName } = input;

    const existing = await this.prismaService.deviceToken.findUnique({
      where: { token },
    });

    if (existing) {
      return this.prismaService.deviceToken.update({
        where: { id: existing.id },
        data: {
          lastUsedAt: new Date(),
          deviceName,
        },
      });
    }

    const deviceToken = await this.prismaService.deviceToken.create({
      data: {
        deviceName,
        deviceType,
        token,
        userId: user.id,
      },
    });

    return deviceToken;
  }

  async sendChatMessagePushNotification(
    recipientId: string,
    senderDisplayName: string,
    messageText: string,
    chatId: string,
  ) {
    const settings = await this.prismaService.notificationsSettings.findUnique({
      where: { userId: recipientId },
    });

    if (settings?.pushNotifications === false) return;

    const body =
      messageText.length > 100 ? messageText.slice(0, 97) + '...' : messageText;

    await this.sendPushNotification(recipientId, {
      title: `💬 ${senderDisplayName}`,
      body,
      data: { type: 'NEW_MESSAGE', chatId },
    });
  }

  async removeDeviceToken(user: User, token: string) {
    await this.prismaService.deviceToken.delete({
      where: {
        token,
        userId: user.id,
      },
    });

    return true;
  }

  async getDevices(user: User) {
    const devices = await this.prismaService.deviceToken.findMany({
      where: { userId: user.id },
      orderBy: { lastUsedAt: 'desc' },
    });

    return devices;
  }

  //   Сами уведомления

  async enableTwoFactorAuthentication(actorId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: actorId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    await this.createNotification({
      userId: user.id,
      type: NotificationsType.ENABLE_TWO_FACTOR,
      message: `Поздравляем! Вы включили двухфакторную аутентификацию.`,
    });
  }

  async disableTwoFactorAuthentication(actorId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: actorId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    await this.createNotification({
      userId: user.id,
      type: NotificationsType.DISABLE_TWO_FACTOR,
      message: `Двухфакторная аутентификация была отключена.`,
    });
  }

  async notifyArticleComment(
    actorId: string,
    articleId: string,
    commentId: string,
    text: string,
  ) {
    const post = await this.prismaService.post.findUnique({
      where: { id: articleId },
    });

    if (!post) return;

    const preview = text.length > 100 ? text.slice(0, 97) + '...' : text;

    await this.createNotification({
      userId: actorId,
      type: NotificationsType.POST_COMMENT,
      message: `Новый комментарий к статье «${post.title}»: «${preview}»`,
      actorId,
      projectId: articleId,
      commentId,
    });
  }

  // ─── ORDER NOTIFICATIONS ──────────────────────────────────────────────────

  async notifyOrderPlaced(userId: string, orderId: string) {
    await this.createNotification({
      userId,
      type: NotificationsType.ORDER_PLACED,
      message: `Ваш заказ #${orderId.slice(-8).toUpperCase()} успешно оформлен. Ожидайте подтверждения.`,
      projectId: orderId,
    });
  }

  async notifyOrderPaid(userId: string, orderId: string) {
    await this.createNotification({
      userId,
      type: NotificationsType.ORDER_PAID,
      message: `Оплата по заказу #${orderId.slice(-8).toUpperCase()} прошла успешно.`,
      projectId: orderId,
    });
  }

  async notifyOrderStatusChanged(
    userId: string,
    orderId: string,
    status: string,
  ) {
    const statusMessages: Record<string, string> = {
      CONFIRMED: `Ваш заказ #${orderId.slice(-8).toUpperCase()} подтверждён.`,
      SHIPPED: `Ваш заказ #${orderId.slice(-8).toUpperCase()} отправлен.`,
      DELIVERED: `Ваш заказ #${orderId.slice(-8).toUpperCase()} доставлен. Приятных покупок!`,
      CANCELLED: `Ваш заказ #${orderId.slice(-8).toUpperCase()} был отменён.`,
      REFUNDED: `По заказу #${orderId.slice(-8).toUpperCase()} выполнен возврат средств.`,
    };

    const typeMap: Record<string, NotificationsType> = {
      CONFIRMED: NotificationsType.ORDER_CONFIRMED,
      SHIPPED: NotificationsType.ORDER_SHIPPED,
      DELIVERED: NotificationsType.ORDER_DELIVERED,
      CANCELLED: NotificationsType.ORDER_CANCELLED,
      REFUNDED: NotificationsType.ORDER_REFUNDED,
    };

    const message =
      statusMessages[status] ??
      `Статус вашего заказа #${orderId.slice(-8).toUpperCase()} изменён на ${status}.`;
    const type = typeMap[status] ?? NotificationsType.ORDER_STATUS_CHANGED;

    await this.createNotification({
      userId,
      type,
      message,
      projectId: orderId,
    });
  }

  async notifyOrderCancelledByUser(userId: string, orderId: string) {
    await this.createNotification({
      userId,
      type: NotificationsType.ORDER_CANCELLED,
      message: `Ваш заказ #${orderId.slice(-8).toUpperCase()} отменён по вашему запросу.`,
      projectId: orderId,
    });
  }

  async notifyOrderRefunded(userId: string, orderId: string) {
    await this.createNotification({
      userId,
      type: NotificationsType.ORDER_REFUNDED,
      message: `Возврат средств по заказу #${orderId.slice(-8).toUpperCase()} успешно выполнен.`,
      projectId: orderId,
    });
  }

  async notifyNewPost(title: string) {
    const users = await this.prismaService.notificationsSettings.findMany({
      where: { siteNotifications: true },
      select: { userId: true },
    });

    await Promise.all(
      users.map(({ userId }) =>
        this.createNotification({
          userId,
          type: NotificationsType.NEW_POST,
          message: `Новая статья: «${title}»`,
        }),
      ),
    );
  }
}
