import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateAddressInput, UpdateAddressInput } from './inputs/address.input';

@Injectable()
export class AddressService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMyAddresses(userId: string) {
    return this.prismaService.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, input: CreateAddressInput) {
    if (input.isDefault) {
      await this.clearDefault(userId);
    }

    const count = await this.prismaService.userAddress.count({
      where: { userId },
    });
    const isDefault = input.isDefault ?? count === 0;

    return this.prismaService.userAddress.create({
      data: { ...input, userId, isDefault },
    });
  }

  async updateAddress(userId: string, id: string, input: UpdateAddressInput) {
    const address = await this.prismaService.userAddress.findUnique({
      where: { id },
    });
    if (!address) throw new NotFoundException('Адрес не найден');
    if (address.userId !== userId)
      throw new ForbiddenException(
        'Другой пользователь не может реадктировать, только ты.',
      );

    if (input.isDefault) {
      await this.clearDefault(userId);
    }

    return this.prismaService.userAddress.update({
      where: { id },
      data: input,
    });
  }

  async deleteAddress(userId: string, id: string) {
    const address = await this.prismaService.userAddress.findUnique({
      where: { id },
    });
    if (!address) throw new NotFoundException('Адрес не найден');
    if (address.userId !== userId) throw new ForbiddenException();

    await this.prismaService.userAddress.delete({ where: { id } });

    if (address.isDefault) {
      const next = await this.prismaService.userAddress.findFirst({
        where: { userId },
      });
      if (next) {
        await this.prismaService.userAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return true;
  }

  async setDefault(userId: string, id: string) {
    const address = await this.prismaService.userAddress.findUnique({
      where: { id },
    });
    if (!address) throw new NotFoundException('Адрес не найден');
    if (address.userId !== userId) throw new ForbiddenException();

    await this.clearDefault(userId);
    return this.prismaService.userAddress.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  private async clearDefault(userId: string) {
    await this.prismaService.userAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }
}
