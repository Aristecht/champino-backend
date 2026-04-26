import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class UpdateProductInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(0)
  stock?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  images?: string[];

  @Field(() => String, { nullable: true })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  attributes?: Record<string, unknown>;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;
}
