import { Args, Query, Resolver } from '@nestjs/graphql';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSummaryModel } from './models/analytics.model';
import { Authorization } from '../../../shared/decorators/authorization.decorator';
import { Role } from '../../../../prisma/generated/prisma/enums';

@Authorization(Role.ADMIN, Role.MANAGER)
@Resolver('Analytics')
export class AnalyticsResolver {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Query(() => AnalyticsSummaryModel, { name: 'getAnalyticsSummary' })
  getAnalyticsSummary(@Args('from') from: string, @Args('to') to: string) {
    return this.analyticsService.getSummary(new Date(from), new Date(to));
  }
}
