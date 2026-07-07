import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IS_DEV_ENV } from '../shared/utils/is-dev.util';
import { getGraphQLConfig } from './config/graphql.config';
import { getThrottlerConfig } from './config/throttler.config';
import { RedisModule } from './redis/redis.module';
import { AccountModule } from '../modules/auth/account/account.module';
import { SessionModule } from '../modules/auth/session/session.module';
import { VerificationModule } from '../modules/auth/verification/verification.module';
import { MailModule } from '../modules/libs/mail/mail.module';
import { PasswordRecoveryModule } from '../modules/auth/password-recovery/password-recovery.module';
import { TotpModule } from '../modules/auth/totp/totp.module';
import { DeactivateModule } from '../modules/auth/deactivate/deactivate.module';
import { CronModule } from '../modules/cron/cron.module';
import { StorageModule } from '../modules/libs/storage/storage.module';
import { OauthModule } from '../modules/auth/oauth/oauth.module';

import { NotificationsModule } from '../modules/notifications/notifications.module';
import { FirebaseModule } from './firebase/firebase.module';
import { CategoryModule } from '../modules/content/category/category.module';
import { ProductModule } from '../modules/content/product/product.module';
import { CartModule } from '../modules/content/cart/cart.module';
import { OrderModule } from '../modules/content/order/order.module';
import { PaymentModule } from '../modules/content/payment/payment.module';
import { WebhookModule } from '../modules/content/webhook/webhook.module';
import { ReviewModule } from '../modules/content/review/review.module';
import { AddressModule } from '../modules/content/address/address.module';
import { BranchModule } from '../modules/content/branch/branch.module';
import { AnalyticsModule } from '../modules/content/analytics/analytics.module';
import { NewsModule } from '../modules/content/news/news.module';
import { LoyaltyModule } from '../modules/loyalty/loyalty.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getThrottlerConfig,
    }),
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      useFactory: getGraphQLConfig,
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    PrismaModule,
    RedisModule,
    AccountModule,
    SessionModule,
    MailModule,
    CronModule,
    StorageModule,
    VerificationModule,
    PasswordRecoveryModule,
    TotpModule,
    DeactivateModule,
    OauthModule,
    FirebaseModule,
    NotificationsModule,
    CategoryModule,
    ProductModule,
    CartModule,
    OrderModule,
    PaymentModule,
    WebhookModule,
    ReviewModule,
    AddressModule,
    BranchModule,
    AnalyticsModule,
    NewsModule,
    LoyaltyModule,
  ],
})
export class CoreModule {}
