import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { NotificationModel } from '../../../notifications/models/notification.model';
import { NotificationSettingsModel } from '../../../notifications/models/notifications-settings.model';
import { Role, User } from '../../../../../prisma/generated/prisma/client';

registerEnumType(Role, { name: 'Role' });

@ObjectType()
export class UserModel implements User {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  username: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  phoneNumber: string;

  @Field(() => String)
  password: string;

  @Field(() => String, { nullable: true })
  avatar: string;
  @Field(() => String, { nullable: true })
  bio: string;

  @Field(() => [String])
  notifications: string[];

  @Field(() => Boolean)
  isVerified: boolean;

  @Field(() => Boolean)
  isEmailVerified: boolean;

  @Field(() => Boolean)
  isTotpEnabled: boolean;

  @Field(() => String, { nullable: true })
  totpSecret: string;

  @Field(() => Boolean)
  isDeactivated: boolean;

  @Field(() => Date, { nullable: true })
  deactivatedAt: Date;

  @Field(() => [NotificationModel])
  notificaitons: NotificationModel[];

  @Field(() => NotificationSettingsModel)
  notificationsSettings: NotificationSettingsModel;

  @Field(() => String)
  pendingNewEmail: string;

  @Field(() => Role)
  role: Role;

  @Field(() => Date)
  createdAt: Date;
  @Field(() => Date)
  updatedAt: Date;
}
