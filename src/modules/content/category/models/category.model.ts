import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CategoryModel {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field({ nullable: true })
  parentId?: string;

  @Field(() => [CategoryModel], { nullable: true })
  children?: CategoryModel[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
