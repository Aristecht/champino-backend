import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderResolver } from './order.resolver';
import { PrismaModule } from '../../../core/prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { LoyaltyModule } from '../../loyalty/loyalty.module';

@Module({
  imports: [PrismaModule, PaymentModule, LoyaltyModule],
  providers: [OrderResolver, OrderService],
})
export class OrderModule {}
