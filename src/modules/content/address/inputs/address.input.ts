import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateAddressInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  city: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  street: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  building: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  apartment?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @Field({ nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

@InputType()
export class UpdateAddressInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  fullName?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  phone?: string;

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

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
