import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { NewsService } from './news.service';
import {
  ArticleCommentModel,
  PostListModel,
  PostModel,
} from './models/post.model';
import {
  CreateCommentInput,
  CreatePostInput,
  FilterPostInput,
  UpdatePostInput,
} from './inputs/post.input';
import { Authorization } from '../../../shared/decorators/authorization.decorator';
import { Authorized } from '../../../shared/decorators/authorized.decorator';
import { Role } from '../../../../prisma/generated/prisma/enums';

@Resolver(() => PostModel)
export class NewsResolver {
  constructor(private readonly newsService: NewsService) {}

  // ─── PUBLIC ───────────────────────────────────────────────────────────────

  @Query(() => PostListModel, { name: 'getPosts' })
  getPosts(@Args('filter', { nullable: true }) filter: FilterPostInput) {
    return this.newsService.findAll(filter ?? {});
  }

  @Query(() => PostModel, { name: 'getPost' })
  getPost(@Args('slug') slug: string) {
    return this.newsService.findOne(slug);
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Query(() => PostListModel, { name: 'adminGetPosts' })
  adminGetPosts(@Args('filter', { nullable: true }) filter: FilterPostInput) {
    return this.newsService.findAll(filter ?? {}, false);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Query(() => PostModel, { name: 'adminGetPost' })
  adminGetPost(@Args('slug') slug: string) {
    return this.newsService.findOne(slug, false);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => Boolean, { name: 'deletePost' })
  deletePost(@Args('id') id: string) {
    return this.newsService.remove(id);
  }

  // ─── COMMENTS (AUTH REQUIRED) ─────────────────────────────────────────────

  @Authorization()
  @Mutation(() => ArticleCommentModel, { name: 'addPostComment' })
  addPostComment(
    @Authorized('id') userId: string,
    @Args('postId') postId: string,
    @Args('data') input: CreateCommentInput,
  ) {
    return this.newsService.addComment(postId, userId, input);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'deletePostComment' })
  deletePostComment(
    @Authorized('id') userId: string,
    @Args('commentId') commentId: string,
  ) {
    return this.newsService.deleteComment(commentId, userId);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => Boolean, { name: 'adminDeletePostComment' })
  adminDeletePostComment(@Args('commentId') commentId: string) {
    return this.newsService.deleteComment(commentId, '', true);
  }
}
