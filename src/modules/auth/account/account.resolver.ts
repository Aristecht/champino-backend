import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { AccountService } from './account.service';
import { UserModel } from './models/user.model';
import { CreateUserInput } from './inputs/create-user.input';
import { Authorized } from '../../../shared/decorators/authorized.decorator';
import { Authorization } from '../../../shared/decorators/authorization.decorator';
import type { User } from '../../../../prisma/generated/prisma/client';
import { Role } from '../../../../prisma/generated/prisma/enums';
import { ChangeEmailInput } from './inputs/change-email.input';
import { ChangePasswordInput } from './inputs/change-password.input';
import { NewEmailInput } from './inputs/new-email.input';
import { registerEnumType } from '@nestjs/graphql';
import { NotificationSettingsModel } from '../../notifications/models/notifications-settings.model';

registerEnumType(Role, { name: 'Role' });

@Resolver(() => UserModel)
export class AccountResolver {
  constructor(private readonly accountService: AccountService) {}

  @ResolveField(() => NotificationSettingsModel)
  async notificationsSettings(@Parent() user: UserModel) {
    const existingSettings = await this.accountService.findNotificationSettings(
      user.id,
    );

    if (existingSettings) {
      return existingSettings;
    }

    return this.accountService.createDefaultNotificationSettings(user.id);
  }

  @Authorization()
  @Query(() => [UserModel], { name: 'findAllUser' })
  async findAll() {
    return this.accountService.findAll();
  }

  @Authorization()
  @Query(() => UserModel, { name: 'findProfile' })
  async me(@Authorized('id') id: string) {
    return this.accountService.me(id);
  }

  @Mutation(() => UserModel, { name: 'createUser' })
  async create(@Args('data') input: CreateUserInput) {
    return this.accountService.create(input);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'changeEmail' })
  async changeEmail(
    @Authorized() user: User,
    @Args('data') input: ChangeEmailInput,
  ) {
    return this.accountService.changeEmail(user, input);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'newEmail' })
  async newEmail(@Authorized() user: User, @Args('data') input: NewEmailInput) {
    return this.accountService.newEmail(user, input);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'changePassword' })
  async changePassword(
    @Authorized() user: User,
    @Args('data') input: ChangePasswordInput,
  ) {
    return this.accountService.changePassword(user, input);
  }

  @Authorization(Role.ADMIN)
  @Mutation(() => UserModel, { name: 'assignRole' })
  async assignRole(
    @Authorized() adminUser: User,
    @Args('userId') userId: string,
    @Args('role', { type: () => Role }) role: Role,
  ) {
    return this.accountService.assignRole(adminUser, userId, role);
  }
}
