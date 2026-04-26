import {
  Field,
  Float,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  PaymentsStatus,
} from '../../../../../prisma/generated/prisma/enums';

registerEnumType(OrderStatus, { name: 'OrderStatus' });
registerEnumType(PaymentMethod, { name: 'PaymentMethod' });
registerEnumType(PaymentsStatus, { name: 'PaymentsStatus' });
registerEnumType(DeliveryType, { name: 'DeliveryType' });

@ObjectType()
export class OrderProductModel {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field(() => [String])
  images: string[];
}

@ObjectType()
export class OrderItemModel {
  @Field(() => ID)
  id: string;

  @Field()
  productId: string;

  @Field({ nullable: true })
  variantId?: string;

  @Field({ nullable: true })
  variantName?: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Float)
  priceAtOrder: number;

  @Field(() => Float)
  subtotal: number;

  @Field(() => OrderProductModel, { nullable: true })
  product?: OrderProductModel;
}

@ObjectType()
export class ShippingAddressModel {
  @Field(() => ID)
  id: string;

  @Field()
  fullName: string;

  @Field()
  phone: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  street?: string;

  @Field({ nullable: true })
  building?: string;

  @Field({ nullable: true })
  apartment?: string;

  @Field({ nullable: true })
  postalCode?: string;

  @Field(() => DeliveryType)
  deliveryType: DeliveryType;

  @Field({ nullable: true })
  branchId?: string;
}

@ObjectType()
export class PaymentModel {
  @Field(() => ID)
  id: string;

  @Field(() => PaymentMethod)
  method: PaymentMethod;

  @Field(() => PaymentsStatus)
  status: PaymentsStatus;

  @Field(() => Float)
  amount: number;

  @Field()
  currency: string;

  // Kaspi
  @Field({ nullable: true })
  kaspiOrderId?: string;

  @Field({ nullable: true })
  kaspiQrToken?: string;

  // Halyk
  @Field({ nullable: true })
  halykInvoiceId?: string;

  @Field({ nullable: true })
  halykOrderId?: string;

  @Field({ nullable: true })
  halykRrn?: string;

  @Field({ nullable: true })
  halykApprovalCode?: string;

  @Field({ nullable: true })
  paidAt?: Date;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class OrderModel {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field(() => OrderStatus)
  status: OrderStatus;

  @Field(() => Float)
  totalAmount: number;

  @Field(() => Float, { nullable: true })
  discountAmount?: number;

  @Field({ nullable: true })
  note?: string;

  @Field(() => [OrderItemModel])
  items: OrderItemModel[];

  @Field(() => ShippingAddressModel, { nullable: true })
  shipping?: ShippingAddressModel;

  @Field(() => PaymentModel, { nullable: true })
  payment?: PaymentModel;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class OrderListModel {
  @Field(() => [OrderModel])
  data: OrderModel[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}

@ObjectType()
export class KaspiPaymentInitModel {
  @Field()
  orderId: string;

  @Field()
  qrToken: string;

  @Field()
  qrUrl: string;

  @Field()
  expiresAt: Date;
}

@ObjectType()
export class HalykPaymentInitModel {
  @Field()
  orderId: string;

  @Field()
  invoiceId: string;

  @Field()
  formUrl: string;
}
