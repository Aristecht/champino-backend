import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { VerificationService } from './verification.service';
import { GqlContext } from '../../../shared/types/gql-context.types';
import { VerificationInput } from './inputs/verification.input';
import { UserAgent } from '../../../shared/decorators/user-agent.decorator';
import { UserModel } from '../account/models/user.model';
import { GqlThrottlerGuard } from '../../../shared/guards/gql-throttler.guard';
import { Authorization } from '../../../shared/decorators/authorization.decorator';
import { Authorized } from '../../../shared/decorators/authorized.decorator';
import type { User } from '../../../../prisma/generated/prisma/client';

@Resolver('Verification')
export class VerificationResolver {
  constructor(private readonly verificationService: VerificationService) {}

  @Throttle({ auth: { limit: 10, ttl: 15 * 60 * 1000 } })
  @UseGuards(GqlThrottlerGuard)
  @Mutation(() => UserModel, { name: 'verifyAccount' })
  async verify(
    @Context() { req }: GqlContext,
    @Args('data') input: VerificationInput,
    @UserAgent() userAgent: string,
  ) {
    return this.verificationService.verify(req, input, userAgent);
  }

  @Authorization()
  @Throttle({ auth: { limit: 3, ttl: 5 * 60 * 1000 } })
  @UseGuards(GqlThrottlerGuard)
  @Mutation(() => Boolean, { name: 'resendVerificationEmail' })
  async resendVerificationEmail(@Authorized() user: User) {
    return this.verificationService.resendVerificationEmail(user);
  }
}
