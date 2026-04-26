import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ArticleCommentModel {
  @Field(() => ID)
  id: string;

  @Field()
  body: string;

  @Field()
  userId: string;

  @Field()
  postId: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class PostModel {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  excerpt?: string;

  @Field()
  body: string;

  @Field({ nullable: true })
  coverImage?: string;

  @Field()
  isPublished: boolean;

  @Field({ nullable: true })
  publishedAt?: Date;

  @Field(() => [String])
  tags: string[];

  @Field(() => [ArticleCommentModel], { nullable: true })
  comments?: ArticleCommentModel[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class PostListModel {
  @Field(() => [PostModel])
  data: PostModel[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  totalPages: number;
}
