import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LoyaltyCardModel {
  @Field(() => String)
  id: string;

  @Field(() => Int)
  totalOrders: number;

  @Field(() => Int)
  discountPct: number;

  @Field(() => String)
  qrToken: string;

  @Field(() => String)
  qrUrl: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
