import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { OrderStatus } from '../../../../prisma/generated/prisma/enums';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getSummary(from: Date, to: Date) {
    const completedStatuses = [
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
    ];

    const ordersAgg = await this.prismaService.order.aggregate({
      where: {
        status: { in: completedStatuses },
        createdAt: { gte: from, lte: to },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const totalRevenue = Number(ordersAgg._sum.totalAmount ?? 0);
    const totalOrders = ordersAgg._count.id;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const newCustomers = await this.prismaService.user.count({
      where: { createdAt: { gte: from, lte: to } },
    });

    const totalUsers = await this.prismaService.user.count();
    const conversionRate =
      totalUsers > 0 ? Math.round((totalOrders / totalUsers) * 10000) / 100 : 0;

    const orders = await this.prismaService.order.findMany({
      where: {
        status: { in: completedStatuses },
        createdAt: { gte: from, lte: to },
      },
      select: { createdAt: true, totalAmount: true },
    });

    const byDay = new Map<string, { revenue: number; count: number }>();
    for (const order of orders) {
      const day = order.createdAt.toISOString().slice(0, 10);
      const existing = byDay.get(day) ?? { revenue: 0, count: 0 };
      existing.revenue += Number(order.totalAmount);
      existing.count += 1;
      byDay.set(day, existing);
    }

    const revenueByDay = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { revenue, count }]) => ({
        date,
        revenue,
        ordersCount: count,
      }));

    // Top products
    const orderItems = await this.prismaService.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: { in: completedStatuses },
          createdAt: { gte: from, lte: to },
        },
      },
      _sum: { quantity: true, priceAtOrder: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    const productIds = orderItems.map(i => i.productId);
    const products = await this.prismaService.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const productMap = new Map(products.map(p => [p.id, p.name]));

    const topProducts = orderItems.map(item => ({
      productId: item.productId,
      productName: productMap.get(item.productId) ?? undefined,
      totalSold: item._sum.quantity ?? 0,
      totalRevenue: Number(item._sum.priceAtOrder ?? 0),
    }));

    return {
      totalRevenue,
      totalOrders,
      newCustomers,
      avgOrderValue,
      conversionRate,
      revenueByDay,
      topProducts,
    };
  }
}
