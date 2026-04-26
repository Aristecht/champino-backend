import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AddressService } from './address.service';
import { UserAddressModel } from './models/address.model';
import { CreateAddressInput, UpdateAddressInput } from './inputs/address.input';
import { Authorization } from '../../../shared/decorators/authorization.decorator';
import { Authorized } from '../../../shared/decorators/authorized.decorator';

@Authorization()
@Resolver('Address')
export class AddressResolver {
  constructor(private readonly addressService: AddressService) {}

  @Query(() => [UserAddressModel], { name: 'getMyAddresses' })
  getMyAddresses(@Authorized('id') userId: string) {
    return this.addressService.getMyAddresses(userId);
  }

  @Mutation(() => UserAddressModel, { name: 'createAddress' })
  createAddress(
    @Authorized('id') userId: string,
    @Args('data') input: CreateAddressInput,
  ) {
    return this.addressService.createAddress(userId, input);
  }

  @Mutation(() => UserAddressModel, { name: 'updateAddress' })
  updateAddress(
    @Authorized('id') userId: string,
    @Args('id') id: string,
    @Args('data') input: UpdateAddressInput,
  ) {
    return this.addressService.updateAddress(userId, id, input);
  }

  @Mutation(() => Boolean, { name: 'deleteAddress' })
  deleteAddress(@Authorized('id') userId: string, @Args('id') id: string) {
    return this.addressService.deleteAddress(userId, id);
  }

  @Mutation(() => UserAddressModel, { name: 'setDefaultAddress' })
  setDefaultAddress(@Authorized('id') userId: string, @Args('id') id: string) {
    return this.addressService.setDefault(userId, id);
  }
}
