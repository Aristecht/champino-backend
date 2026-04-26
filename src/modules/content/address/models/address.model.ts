import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserAddressModel {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  fullName: string;

  @Field()
  phone: string;

  @Field()
  city: string;

  @Field()
  street: string;

  @Field()
  building: string;

  @Field({ nullable: true })
  apartment?: string;

  @Field({ nullable: true })
  postalCode?: string;

  @Field()
  isDefault: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
