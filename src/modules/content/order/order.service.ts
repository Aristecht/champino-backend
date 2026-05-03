import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { KaspiService } from '../payment/kaspi.service';
import { HalykService } from '../payment/halyk.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { LoyaltyService } from '../../loyalty/loyalty.service';
import { CreateOrderInput } from './inputs/create-order.input';
import { FilterOrderInput } from './inputs/filter-order.input';
import { UpdateOrderStatusInput } from './inputs/update-order-status.input';
import {
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  PaymentsStatus,
} from '../../../../prisma/generated/prisma/enums';

const ORDER_INCLUDE = {
  items: {
    include: {
      product: { select: { id: true, name: true, medias: true } },
    },
  },
  shipping: true,
  payment: true,
} as const;

function mapOrder(order: any) {
  return {
    ...order,
    totalAmount: Number(order.totalAmount),
    discountAmount:
      order.discountAmount === null || order.discountAmount === undefined
        ? null
        : Number(order.discountAmount),
    items: order.items.map((item: any) => ({
      ...item,
      product: item.product
        ? {
            ...item.product,
            images: (item.product.medias ?? []).map((media: any) => media.url),
          }
        : null,
      priceAtOrder: Number(item.priceAtOrder),
      subtotal: Number(item.priceAtOrder) * item.quantity,
    })),
    payment: order.payment
      ? {
          ...order.payment,
          amount: Number(order.payment.amount),
        }
      : null,
  };
}

@Injectable()
export class OrderService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly kaspiService: KaspiService,
    private readonly halykService: HalykService,
    private readonly notificationsService: NotificationsService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  // ─── USER ─────────────────────────────────────────────────────────────────

  async createOrder(userId: string, input: CreateOrderInput) {
    const { shipping, paymentMethod, note } = input;

    if (shipping.deliveryType === DeliveryType.PICKUP && !shipping.branchId) {
      throw new BadRequestException('Для самовывоза необходимо указать филиал');
    }
    if (
      shipping.deliveryType === DeliveryType.COURIER &&
      (!shipping.city || !shipping.street || !shipping.building)
    ) {
      throw new BadRequestException('Для курьерской доставки укажите адрес');
    }
    if (
      paymentMethod === PaymentMethod.CASH_ON_DELIVERY &&
      shipping.deliveryType !== DeliveryType.PICKUP
    ) {
      throw new BadRequestException(
        'Оплата при получении доступна только при самовывозе',
      );
    }

    if (shipping.branchId) {
      const branch = await this.prismaService.branch.findUnique({
        where: { id: shipping.branchId },
      });
      if (!branch || !branch.isActive) {
        throw new BadRequestException('Филиал не найден или неактивен');
      }
    }

    const cart = await this.prismaService.cart.findUnique({
      where: { userId },
      include: {
        items: {
          where: { isSelected: true },
          include: {
            product: {
              select: {
                id: true,
                price: true,
                discountPercent: true,
                stock: true,
                isPublished: true,
                name: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Нет выбранных товаров в корзине');
    }

    for (const item of cart.items) {
      if (!item.product.isPublished) {
        throw new BadRequestException(
          `Товар "${item.product.name}" недоступен для заказа`,
        );
      }
      if (item.variant) {
        if (!item.variant.isActive) {
          throw new BadRequestException(
            `Вариант "${item.variant.name}" недоступен`,
          );
        }
        if (item.variant.stock < item.quantity) {
          throw new BadRequestException(
            `Недостаточно варианта "${item.variant.name}" на складе. Доступно: ${item.variant.stock}`,
          );
        }
      } else {
        if (item.product.stock < item.quantity) {
          throw new BadRequestException(
            `Недостаточно товара "${item.product.name}" на складе. Доступно: ${item.product.stock}`,
          );
        }
      }
    }

    const pricedItems = cart.items.map(item => {
      const baseUnitPrice = item.variant?.price
        ? Number(item.variant.price)
        : Number(item.product.price);
      const discountPercent = item.product.discountPercent ?? 0;
      const discountedUnitPrice = +(
        baseUnitPrice *
        (1 - discountPercent / 100)
      ).toFixed(2);
      return {
        ...item,
        unitPriceAtOrder: discountedUnitPrice,
        baseLineTotal: baseUnitPrice * item.quantity,
        discountedLineTotal: discountedUnitPrice * item.quantity,
      };
    });

    const baseSubtotal = pricedItems.reduce(
      (sum, item) => sum + item.baseLineTotal,
      0,
    );
    const subtotal = pricedItems.reduce(
      (sum, item) => sum + item.discountedLineTotal,
      0,
    );
    const totalAmount = +subtotal.toFixed(2);
    const discountAmount = +(baseSubtotal - subtotal).toFixed(2);

    const order = await this.prismaService.$transaction(async tx => {
      for (const item of cart.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          note,
          status: OrderStatus.PROCESSING,
          items: {
            create: pricedItems.map(item => {
              return {
                productId: item.productId,
                variantId: item.variantId ?? undefined,
                variantName: item.variant?.name ?? undefined,
                quantity: item.quantity,
                priceAtOrder: item.unitPriceAtOrder,
              };
            }),
          },
          discountAmount,
          shipping: {
            create: {
              fullName: shipping.fullName,
              phone: shipping.phone,
              city: shipping.city ?? '',
              street: shipping.street ?? '',
              building: shipping.building ?? '',
              apartment: shipping.apartment,
              postalCode: shipping.postalCode,
              deliveryType: shipping.deliveryType ?? DeliveryType.COURIER,
              branchId: shipping.branchId ?? undefined,
            },
          },
          payment: {
            create: {
              method: paymentMethod,
              status:
                paymentMethod === PaymentMethod.CASH_ON_DELIVERY
                  ? PaymentsStatus.PENDING
                  : PaymentsStatus.PENDING,
              amount: totalAmount,
              currency: 'KZT',
            },
          },
        },
        include: ORDER_INCLUDE,
      });

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id, isSelected: true },
      });

      return newOrder;
    });

    const mapped = mapOrder(order);
    // Fire-and-forget — don't block the response
    this.notificationsService
      .notifyOrderPlaced(userId, order.id)
      .catch(() => {});
    this.notificationsService
      .notifyAdminsAboutNewOrder(order.id, userId)
      .catch(() => {});
    return mapped;
  }

  async initPayment(userId: string, orderId: string) {
    const order = await this.prismaService.order.findFirst({
      where: { id: orderId, userId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (!order.payment) throw new BadRequestException('Платёж не найден');
    if (order.payment.status !== PaymentsStatus.PENDING) {
      throw new BadRequestException('Платёж уже обработан');
    }

    if (order.payment.method === PaymentMethod.CASH_ON_DELIVERY) {
      return {
        type: 'CASH_ON_DELIVERY',
        orderId: order.id,
      };
    }

    if (order.payment.method === PaymentMethod.KASPI_PAY) {
      const result = await this.kaspiService.createQrPayment({
        orderId: order.id,
        amount: Number(order.totalAmount),
      });

      await this.prismaService.payment.update({
        where: { id: order.payment.id },
        data: {
          kaspiOrderId: result.kaspiOrderId,
          kaspiQrToken: result.qrToken,
          expiresAt: result.expiresAt,
          status: PaymentsStatus.PROCESSING,
        },
      });

      return {
        type: 'KASPI',
        orderId: order.id,
        qrToken: result.qrToken,
        qrUrl: result.qrUrl,
        paymentUrl: result.paymentUrl,
        expiresAt: result.expiresAt,
      };
    }

    if (order.payment.method === PaymentMethod.HALYK_EKVAYRING) {
      const backUrl = `${process.env.APP_URL}/orders/${order.id}/payment/success`;
      const failureUrl = `${process.env.APP_URL}/orders/${order.id}/payment/failure`;

      const result = await this.halykService.createInvoice({
        orderId: order.id,
        amount: Number(order.totalAmount),
        backUrl,
        failureUrl,
      });

      await this.prismaService.payment.update({
        where: { id: order.payment.id },
        data: {
          halykInvoiceId: result.invoiceId,
          halykOrderId: result.halykOrderId,
          status: PaymentsStatus.PROCESSING,
          rawResponse: result.raw,
        },
      });

      return {
        type: 'HALYK',
        orderId: order.id,
        invoiceId: result.invoiceId,
        formUrl: result.formUrl,
      };
    }

    throw new BadRequestException('Неизвестный метод оплаты');
  }

  async checkPaymentStatus(userId: string, orderId: string) {
    const order = await this.prismaService.order.findFirst({
      where: { id: orderId, userId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (!order.payment) throw new BadRequestException('Платёж не найден');

    const payment = order.payment;

    if (payment.method === PaymentMethod.KASPI_PAY && payment.kaspiOrderId) {
      const result = await this.kaspiService.checkPaymentStatus(
        payment.kaspiOrderId,
      );

      if (result.paid) {
        await this.prismaService.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentsStatus.SUCCEEDED,
            kaspiPaymentId: result.kaspiPaymentId,
            paidAt: new Date(),
            rawResponse: result.raw,
          },
        });
      }

      return result.paid;
    }

    if (
      payment.method === PaymentMethod.HALYK_EKVAYRING &&
      payment.halykInvoiceId
    ) {
      const result = await this.halykService.getInvoiceStatus(
        payment.halykInvoiceId,
      );

      if (result.paid) {
        await this.prismaService.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentsStatus.SUCCEEDED,
            halykRrn: result.rrn,
            halykApprovalCode: result.approvalCode,
            halykTerminalId: result.terminalId,
            paidAt: new Date(),
            rawResponse: result.raw,
          },
        });
      }

      return result.paid;
    }

    return false;
  }

  async getMyOrders(userId: string, filter: FilterOrderInput) {
    const { status, page = 1, limit = 20 } = filter;
    const where: any = { userId };
    if (status) where.status = status;

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.order.count({ where }),
    ]);

    return { data: data.map(mapOrder), total, page, limit };
  }

  async getMyOrder(userId: string, orderId: string) {
    const order = await this.prismaService.order.findFirst({
      where: { id: orderId, userId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    return mapOrder(order);
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prismaService.order.findFirst({
      where: { id: orderId, userId },
      include: { payment: true, items: true },
    });
    if (!order) throw new NotFoundException('Заказ не найден');

    const cancellable: OrderStatus[] = [
      OrderStatus.PROCESSING,
      OrderStatus.ASSEMBLING,
      OrderStatus.READY_FOR_PICKUP,
    ];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException('Заказ нельзя отменить на данном этапе');
    }

    await this.prismaService.$transaction(async tx => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });

      if (order.payment && order.payment.status === PaymentsStatus.SUCCEEDED) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: PaymentsStatus.REFUNDED },
        });
      }
    });

    this.notificationsService
      .notifyOrderCancelledByUser(userId, orderId)
      .catch(() => {});

    return true;
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────

  async adminGetAllOrders(filter: FilterOrderInput) {
    const { status, page = 1, limit = 20 } = filter;
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.order.count({ where }),
    ]);

    return { data: data.map(mapOrder), total, page, limit };
  }

  async adminGetOrder(orderId: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    return mapOrder(order);
  }

  async adminUpdateOrderStatus(orderId: string, input: UpdateOrderStatusInput) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: { shipping: true, payment: true },
    });
    if (!order) throw new NotFoundException('Заказ не найден');

    if (!order.shipping) {
      throw new BadRequestException('Для заказа не указаны данные доставки');
    }

    const next = input.status;
    const current = order.status;
    const isPickup = order.shipping.deliveryType === DeliveryType.PICKUP;

    const pickupFlow: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PROCESSING]: [OrderStatus.ASSEMBLING, OrderStatus.CANCELLED],
      [OrderStatus.ASSEMBLING]: [
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.READY_FOR_PICKUP]: [
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.IN_TRANSIT]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    const courierFlow: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PROCESSING]: [OrderStatus.ASSEMBLING, OrderStatus.CANCELLED],
      [OrderStatus.ASSEMBLING]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
      [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.READY_FOR_PICKUP]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    const allowed = (isPickup ? pickupFlow : courierFlow)[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Недопустимый переход статуса ${current} -> ${next} для ${isPickup ? 'самовывоза' : 'курьерской доставки'}`,
      );
    }

    const updated = await this.prismaService.order.update({
      where: { id: orderId },
      data: { status: next },
      include: ORDER_INCLUDE,
    });

    this.notificationsService
      .notifyOrderStatusChanged(order.userId, orderId, input.status)
      .catch(() => {});

    if (
      (next === OrderStatus.COMPLETED || next === OrderStatus.DELIVERED) &&
      order.payment?.status === PaymentsStatus.SUCCEEDED
    ) {
      this.loyaltyService.incrementOrderCount(order.userId).catch(() => {});
    }

    return mapOrder(updated);
  }

  async adminRefundOrder(orderId: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: { payment: true, items: true },
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (!order.payment || order.payment.status !== PaymentsStatus.SUCCEEDED) {
      throw new BadRequestException('Платёж не может быть возвращён');
    }

    const amount = Number(order.payment.amount);

    if (
      order.payment.method === PaymentMethod.KASPI_PAY &&
      order.payment.kaspiPaymentId
    ) {
      await this.kaspiService.refundPayment(
        order.payment.kaspiPaymentId,
        amount,
      );
    } else if (
      order.payment.method === PaymentMethod.HALYK_EKVAYRING &&
      order.payment.halykInvoiceId
    ) {
      await this.halykService.refundInvoice(
        order.payment.halykInvoiceId,
        amount,
      );
    } else {
      throw new BadRequestException('Данные платежа отсутствуют');
    }

    await this.prismaService.$transaction([
      this.prismaService.payment.update({
        where: { id: order.payment.id },
        data: { status: PaymentsStatus.REFUNDED },
      }),
      this.prismaService.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REFUNDED },
      }),
    ]);

    this.notificationsService
      .notifyOrderRefunded(order.userId, orderId)
      .catch(() => {});

    return true;
  }

  async adminApplyDiscount(orderId: string, discountPercent: number) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (discountPercent < 0 || discountPercent > 100) {
      throw new BadRequestException('Скидка должна быть от 0 до 100%');
    }

    const baseAmount = Number(order.totalAmount);
    const discountedAmount = +(
      baseAmount *
      (1 - discountPercent / 100)
    ).toFixed(2);
    const addedDiscountAmount = +(baseAmount - discountedAmount).toFixed(2);
    const currentDiscountAmount = Number(order.discountAmount ?? 0);

    const updated = await this.prismaService.order.update({
      where: { id: orderId },
      data: {
        totalAmount: discountedAmount,
        discountAmount: +(currentDiscountAmount + addedDiscountAmount).toFixed(
          2,
        ),
      },
      include: ORDER_INCLUDE,
    });

    return mapOrder(updated);
  }
}
