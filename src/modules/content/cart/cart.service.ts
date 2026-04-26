import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AddToCartInput } from './inputs/add-to-cart.input';
import { UpdateCartItemInput } from './inputs/update-cart-item.input';

@Injectable()
export class CartService {
  constructor(private readonly prismaService: PrismaService) {}

  private readonly productInclude = {
    select: { id: true, name: true, price: true, images: true },
  };

  private buildCartResponse(cart: {
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      cartId: string;
      productId: string;
      quantity: number;
      isSelected: boolean;
      createdAt: Date;
      updatedAt: Date;
      product: {
        id: string;
        name: string | null;
        price: any;
        images: string[];
      };
    }>;
  }) {
    const items = cart.items.map(item => ({
      ...item,
      subtotal: item.product?.price
        ? Number(item.product.price) * item.quantity
        : 0,
    }));

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    const selectedItems = items.filter(item => item.isSelected);
    const selectedTotal = selectedItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    const selectedCount = selectedItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    return { ...cart, items, total, totalItems, selectedTotal, selectedCount };
  }

  private async getOrCreateCart(userId: string) {
    return this.prismaService.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: {
        items: {
          include: { product: this.productInclude },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    return this.buildCartResponse(cart);
  }

  async addItem(userId: string, input: AddToCartInput) {
    const { productId, quantity = 1 } = input;

    const product = await this.prismaService.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Товар не найден');
    if (!product.isPublished)
      throw new BadRequestException('Товар недоступен для покупки');
    if (product.stock < quantity)
      throw new BadRequestException(
        `Недостаточно товара на складе. Доступно: ${product.stock}`,
      );

    const cart = await this.getOrCreateCart(userId);

    const existingItem = await this.prismaService.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId: null },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity)
        throw new BadRequestException(
          `Недостаточно товара на складе. Доступно: ${product.stock}`,
        );

      await this.prismaService.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await this.prismaService.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, input: UpdateCartItemInput) {
    const { productId, quantity } = input;

    const cart = await this.prismaService.cart.findUnique({
      where: { userId },
    });
    if (!cart) throw new NotFoundException('Корзина не найдена');

    const item = await this.prismaService.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId: null },
    });
    if (!item) throw new NotFoundException('Товар не найден в корзине');

    const product = await this.prismaService.product.findUnique({
      where: { id: productId },
    });
    if (product && product.stock < quantity)
      throw new BadRequestException(
        `Недостаточно товара на складе. Доступно: ${product.stock}`,
      );

    await this.prismaService.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  async toggleItemSelection(userId: string, productId: string) {
    const cart = await this.prismaService.cart.findUnique({
      where: { userId },
    });
    if (!cart) throw new NotFoundException('Корзина не найдена');

    const item = await this.prismaService.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId: null },
    });
    if (!item) throw new NotFoundException('Товар не найден в корзине');

    await this.prismaService.cartItem.update({
      where: { id: item.id },
      data: { isSelected: !item.isSelected },
    });

    return this.getCart(userId);
  }

  async setAllItemsSelection(userId: string, isSelected: boolean) {
    const cart = await this.prismaService.cart.findUnique({
      where: { userId },
    });
    if (!cart) throw new NotFoundException('Корзина не найдена');

    await this.prismaService.cartItem.updateMany({
      where: { cartId: cart.id },
      data: { isSelected },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.prismaService.cart.findUnique({
      where: { userId },
    });
    if (!cart) throw new NotFoundException('Корзина не найдена');

    const item = await this.prismaService.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId: null },
    });
    if (!item) throw new NotFoundException('Товар не найден в корзине');

    await this.prismaService.cartItem.delete({ where: { id: item.id } });

    return this.getCart(userId);
  }

  async removeSelectedItems(userId: string) {
    const cart = await this.prismaService.cart.findUnique({
      where: { userId },
    });
    if (!cart) throw new NotFoundException('Корзина не найдена');

    await this.prismaService.cartItem.deleteMany({
      where: { cartId: cart.id, isSelected: true },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prismaService.cart.findUnique({
      where: { userId },
    });
    if (!cart) return true;

    await this.prismaService.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return true;
  }
}
