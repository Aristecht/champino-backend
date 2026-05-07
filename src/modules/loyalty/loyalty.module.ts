import { Module } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyResolver } from './loyalty.resolver';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { RostaLoyaltyController } from './rosta.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RostaLoyaltyController],
  providers: [LoyaltyResolver, LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
