import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CartService } from './cart.service';
import { CartModel } from './models/cart.model';
import { AddToCartInput } from './inputs/add-to-cart.input';
import { UpdateCartItemInput } from './inputs/update-cart-item.input';
import { Authorization } from '../../../shared/decorators/authorization.decorator';
import { Authorized } from '../../../shared/decorators/authorized.decorator';

@Authorization()
@Resolver('Cart')
export class CartResolver {
  constructor(private readonly cartService: CartService) {}

  @Query(() => CartModel, { name: 'getCart' })
  getCart(@Authorized('id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Mutation(() => CartModel, { name: 'addToCart' })
  addToCart(
    @Authorized('id') userId: string,
    @Args('data') input: AddToCartInput,
  ) {
    return this.cartService.addItem(userId, input);
  }

  @Mutation(() => CartModel, { name: 'updateCartItem' })
  updateCartItem(
    @Authorized('id') userId: string,
    @Args('data') input: UpdateCartItemInput,
  ) {
    return this.cartService.updateItem(userId, input);
  }

  @Mutation(() => CartModel, { name: 'toggleCartItemSelection' })
  toggleCartItemSelection(
    @Authorized('id') userId: string,
    @Args('productId') productId: string,
  ) {
    return this.cartService.toggleItemSelection(userId, productId);
  }

  @Mutation(() => CartModel, { name: 'selectAllCartItems' })
  selectAllCartItems(@Authorized('id') userId: string) {
    return this.cartService.setAllItemsSelection(userId, true);
  }

  @Mutation(() => CartModel, { name: 'deselectAllCartItems' })
  deselectAllCartItems(@Authorized('id') userId: string) {
    return this.cartService.setAllItemsSelection(userId, false);
  }

  @Mutation(() => CartModel, { name: 'removeFromCart' })
  removeFromCart(
    @Authorized('id') userId: string,
    @Args('productId') productId: string,
  ) {
    return this.cartService.removeItem(userId, productId);
  }

  @Mutation(() => CartModel, { name: 'removeSelectedFromCart' })
  removeSelectedFromCart(@Authorized('id') userId: string) {
    return this.cartService.removeSelectedItems(userId);
  }

  @Mutation(() => Boolean, { name: 'clearCart' })
  clearCart(@Authorized('id') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
