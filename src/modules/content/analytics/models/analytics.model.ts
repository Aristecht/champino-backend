import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RevenueByPeriodModel {
  @Field()
  date: string;

  @Field(() => Float)
  revenue: number;

  @Field(() => Int)
  ordersCount: number;
}

@ObjectType()
export class TopProductModel {
  @Field()
  productId: string;

  @Field({ nullable: true })
  productName?: string;

  @Field(() => Int)
  totalSold: number;

  @Field(() => Float)
  totalRevenue: number;
}

@ObjectType()
export class AnalyticsSummaryModel {
  @Field(() => Float)
  totalRevenue: number;

  @Field(() => Int)
  totalOrders: number;

  @Field(() => Int)
  newCustomers: number;

  @Field(() => Float)
  avgOrderValue: number;

  @Field(() => Float)
  conversionRate: number;

  @Field(() => [RevenueByPeriodModel])
  revenueByDay: RevenueByPeriodModel[];

  @Field(() => [TopProductModel])
  topProducts: TopProductModel[];
}
