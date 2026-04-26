import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PaymentInitModel {
  /** KASPI | HALYK | CASH_ON_DELIVERY */
  @Field()
  type: string;

  @Field()
  orderId: string;

  @Field({ nullable: true })
  qrToken?: string;

  @Field({ nullable: true })
  qrUrl?: string;

  // Диплинк https://pay.kaspi.kz/pay/{token}
  @Field({ nullable: true })
  paymentUrl?: string;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field({ nullable: true })
  invoiceId?: string;

  @Field({ nullable: true })
  formUrl?: string;
}
