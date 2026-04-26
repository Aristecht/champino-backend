import { Args, Float, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OrderService } from './order.service';
import { OrderListModel, OrderModel } from './models/order.model';
import { PaymentInitModel } from './models/payment-init.model';
import { CreateOrderInput } from './inputs/create-order.input';
import { FilterOrderInput } from './inputs/filter-order.input';
import { UpdateOrderStatusInput } from './inputs/update-order-status.input';
import { Authorization } from '../../../shared/decorators/authorization.decorator';
import { Authorized } from '../../../shared/decorators/authorized.decorator';
import { Role } from '../../../../prisma/generated/prisma/enums';

@Authorization()
@Resolver('Order')
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  // ─── USER ─────────────────────────────────────────────────────────────────

  @Mutation(() => OrderModel, { name: 'createOrder' })
  createOrder(
    @Authorized('id') userId: string,
    @Args('data') input: CreateOrderInput,
  ) {
    return this.orderService.createOrder(userId, input);
  }

  @Mutation(() => PaymentInitModel, { name: 'initPayment' })
  initPayment(
    @Authorized('id') userId: string,
    @Args('orderId') orderId: string,
  ) {
    return this.orderService.initPayment(userId, orderId);
  }

  @Mutation(() => Boolean, { name: 'checkPaymentStatus' })
  checkPaymentStatus(
    @Authorized('id') userId: string,
    @Args('orderId') orderId: string,
  ) {
    return this.orderService.checkPaymentStatus(userId, orderId);
  }

  @Query(() => OrderListModel, { name: 'getMyOrders' })
  getMyOrders(
    @Authorized('id') userId: string,
    @Args('filter', { nullable: true }) filter: FilterOrderInput,
  ) {
    return this.orderService.getMyOrders(userId, filter ?? {});
  }

  @Query(() => OrderModel, { name: 'getMyOrder' })
  getMyOrder(
    @Authorized('id') userId: string,
    @Args('orderId') orderId: string,
  ) {
    return this.orderService.getMyOrder(userId, orderId);
  }

  @Mutation(() => Boolean, { name: 'cancelOrder' })
  cancelOrder(
    @Authorized('id') userId: string,
    @Args('orderId') orderId: string,
  ) {
    return this.orderService.cancelOrder(userId, orderId);
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Query(() => OrderListModel, { name: 'adminGetAllOrders' })
  adminGetAllOrders(
    @Args('filter', { nullable: true }) filter: FilterOrderInput,
  ) {
    return this.orderService.adminGetAllOrders(filter ?? {});
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Query(() => OrderModel, { name: 'adminGetOrder' })
  adminGetOrder(@Args('orderId') orderId: string) {
    return this.orderService.adminGetOrder(orderId);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => OrderModel, { name: 'adminUpdateOrderStatus' })
  adminUpdateOrderStatus(
    @Args('orderId') orderId: string,
    @Args('data') input: UpdateOrderStatusInput,
  ) {
    return this.orderService.adminUpdateOrderStatus(orderId, input);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => Boolean, { name: 'adminRefundOrder' })
  adminRefundOrder(@Args('orderId') orderId: string) {
    return this.orderService.adminRefundOrder(orderId);
  }
}
