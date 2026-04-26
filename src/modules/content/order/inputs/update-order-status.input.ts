import { Field, InputType } from '@nestjs/graphql';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '../../../../../prisma/generated/prisma/enums';

@InputType()
export class UpdateOrderStatusInput {
  @Field(() => OrderStatus)
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
