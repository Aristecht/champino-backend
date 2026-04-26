import { Module } from '@nestjs/common';
import { KaspiService } from './kaspi.service';
import { HalykService } from './halyk.service';

@Module({
  providers: [KaspiService, HalykService],
  exports: [KaspiService, HalykService],
})
export class PaymentModule {}
