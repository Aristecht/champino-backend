import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentMethod } from '../../../../../prisma/generated/prisma/enums';
import { ShippingAddressInput } from './shipping-address.input';

@InputType()
export class CreateOrderInput {
  @Field(() => ShippingAddressInput)
  shipping: ShippingAddressInput;

  @Field(() => PaymentMethod)
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
