import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ReviewModel {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  productId: string;

  @Field(() => Int)
  rating: number;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  text?: string;

  @Field()
  isVerified: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class ReviewListModel {
  @Field(() => [ReviewModel])
  data: ReviewModel[];

  @Field(() => Int)
  total: number;

  @Field(() => Float)
  avgRating: number;
}
