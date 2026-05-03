import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsNotEmpty,
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
export class CreateProductInput {
  @Field()
  @IsUUID()
  @IsNotEmpty()
  draftId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  price: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @Min(0)
  stock?: number;

  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  attributes?: Record<string, unknown>;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;
}
