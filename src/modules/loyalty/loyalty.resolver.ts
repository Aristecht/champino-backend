import {
  Args,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyCardModel } from './models/loyalty-card.model';
import { Authorization } from '../../shared/decorators/authorization.decorator';
import { Authorized } from '../../shared/decorators/authorized.decorator';
import { Role } from '../../../prisma/generated/prisma/enums';
import { NotFoundException } from '@nestjs/common';

@ObjectType()
class LoyaltyCardWithUserModel extends LoyaltyCardModel {
  @Field(() => String, { nullable: true })
  username?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  phoneNumber?: string;
}

@Resolver()
export class LoyaltyResolver {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Authorization()
  @Query(() => LoyaltyCardModel, { name: 'myLoyaltyCard' })
  async myLoyaltyCard(@Authorized('id') userId: string) {
    return this.loyaltyService.getMyCard(userId);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Query(() => LoyaltyCardWithUserModel, {
    name: 'loyaltyCardByToken',
    nullable: true,
  })
  async loyaltyCardByToken(@Args('qrToken') qrToken: string) {
    const card = await this.loyaltyService.getCardByToken(qrToken);
    if (!card) throw new NotFoundException('Карта лояльности не найдена');
    return {
      ...card,
      username: card.user?.username,
      email: card.user?.email,
      phoneNumber: card.user?.phoneNumber,
    };
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => LoyaltyCardModel, { name: 'confirmLoyaltyPurchase' })
  async confirmLoyaltyPurchase(
    @Args('qrToken') qrToken: string,
    @Args('operationId') operationId: string,
  ) {
    const card = await this.loyaltyService.incrementByQrTokenIdempotent(
      qrToken,
      operationId,
    );
    if (!card) throw new NotFoundException('Карта лояльности не найдена');
    return card;
  }
}
