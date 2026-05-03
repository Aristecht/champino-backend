import { Module } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyResolver } from './loyalty.resolver';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LoyaltyResolver, LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
