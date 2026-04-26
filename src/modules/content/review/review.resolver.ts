import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ReviewService } from './review.service';
import { ReviewListModel, ReviewModel } from './models/review.model';
import { CreateReviewInput } from './inputs/create-review.input';
import { UpdateReviewInput } from './inputs/update-review.input';
import { Authorization } from '../../../shared/decorators/authorization.decorator';
import { Authorized } from '../../../shared/decorators/authorized.decorator';
import { Role } from '../../../../prisma/generated/prisma/enums';

@Resolver('Review')
export class ReviewResolver {
  constructor(private readonly reviewService: ReviewService) {}

  @Query(() => ReviewListModel, { name: 'getProductReviews' })
  getProductReviews(@Args('productId') productId: string) {
    return this.reviewService.getProductReviews(productId);
  }

  @Authorization()
  @Mutation(() => ReviewModel, { name: 'createReview' })
  createReview(
    @Authorized('id') userId: string,
    @Args('data') input: CreateReviewInput,
  ) {
    return this.reviewService.createReview(userId, input);
  }

  @Authorization()
  @Mutation(() => ReviewModel, { name: 'updateReview' })
  updateReview(
    @Authorized('id') userId: string,
    @Args('reviewId') reviewId: string,
    @Args('data') input: UpdateReviewInput,
  ) {
    return this.reviewService.updateReview(userId, reviewId, input);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'deleteReview' })
  deleteReview(
    @Authorized('id') userId: string,
    @Authorized('role') role: Role,
    @Args('reviewId') reviewId: string,
  ) {
    return this.reviewService.deleteReview(userId, reviewId, role);
  }
}
