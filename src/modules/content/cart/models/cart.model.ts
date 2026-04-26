import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CartProductModel {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => [String])
  images: string[];
}

@ObjectType()
export class CartItemModel {
  @Field(() => ID)
  id: string;

  @Field()
  cartId: string;

  @Field()
  productId: string;

  @Field(() => Int)
  quantity: number;

  @Field()
  isSelected: boolean;

  @Field(() => CartProductModel, { nullable: true })
  product?: CartProductModel;

  @Field(() => Float)
  subtotal: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class CartModel {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field(() => [CartItemModel])
  items: CartItemModel[];

  @Field(() => Int)
  totalItems: number;

  @Field(() => Int)
  selectedCount: number;

  @Field(() => Float)
  total: number;

  @Field(() => Float)
  selectedTotal: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
