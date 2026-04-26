import { Field, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { DeliveryType } from '../../../../../prisma/generated/prisma/enums';

@InputType()
export class ShippingAddressInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  city?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  street?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  building?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  apartment?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @Field(() => DeliveryType, {
    nullable: true,
    defaultValue: DeliveryType.COURIER,
  })
  @IsEnum(DeliveryType)
  @IsOptional()
  deliveryType?: DeliveryType;

  @Field({ nullable: true })
  @IsUUID()
  @IsOptional()
  branchId?: string;
}
