import {
  Field,
  Float,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { MediaType } from '../../../../../prisma/generated/prisma/enums';

registerEnumType(MediaType, { name: 'MediaType' });

@ObjectType()
export class ProductMediaModel {
  @Field(() => ID)
  id: string;

  @Field()
  url: string;

  @Field(() => MediaType)
  mediaType: MediaType;
}

@ObjectType()
export class ProductCategoryModel {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;
}

@ObjectType()
export class ProductModel {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => Int)
  stock: number;

  @Field()
  isPublished: boolean;

  @Field()
  isDraft: boolean;

  @Field(() => [String])
  images: string[];

  @Field(() => String, { nullable: true })
  categoryId?: string;

  @Field(() => ProductCategoryModel, { nullable: true })
  category?: ProductCategoryModel;

  @Field(() => [ProductMediaModel], { nullable: true })
  medias?: ProductMediaModel[];

  @Field(() => GraphQLJSON, { nullable: true })
  attributes?: Record<string, unknown>;

  @Field(() => Int, { nullable: true, description: 'Скидка в процентах (0–100)' })
  discountPercent?: number;

  @Field(() => Float, { nullable: true, description: 'Цена после скидки' })
  discountedPrice?: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class ProductMetaModel {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}

@ObjectType()
export class ProductListModel {
  @Field(() => [ProductModel])
  data: ProductModel[];

  @Field(() => ProductMetaModel)
  meta: ProductMetaModel;
}
