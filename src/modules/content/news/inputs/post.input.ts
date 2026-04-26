import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType()
export class CreatePostInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  slug: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  excerpt?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  body: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

@InputType()
export class UpdatePostInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  slug?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  excerpt?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  body?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

@InputType()
export class CreateCommentInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  body: string;
}

@InputType()
export class FilterPostInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  search?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  tag?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  page?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  limit?: number;
}
