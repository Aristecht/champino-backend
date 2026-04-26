import { Field, Float, ID, InputType, ObjectType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

// ─── Model ───────────────────────────────────────────────────────────────────

@ObjectType()
export class ProductVariantModel {
  @Field(() => ID)
  id: string;

  @Field()
  productId: string;

  @Field()
  sku: string;

  @Field()
  name: string;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => Float)
  stock: number;

  @Field(() => String, { nullable: true })
  attributes?: string; // JSON string

  @Field()
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

@InputType()
export class CreateVariantInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  attributes?: string; // JSON string
}

@InputType()
export class UpdateVariantInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sku?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  attributes?: string;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
