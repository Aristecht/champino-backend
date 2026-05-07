import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { Prisma } from '../../../prisma/generated/prisma/client';

const TIERS = [
  { minOrders: 15, pct: 5 },
  { minOrders: 10, pct: 3 },
  { minOrders: 5, pct: 2 },
] as const;

function calcDiscount(totalOrders: number): number {
  for (const tier of TIERS) {
    if (totalOrders >= tier.minOrders) return tier.pct;
  }
  return 0;
}

@Injectable()
export class LoyaltyService {
  constructor(private readonly prismaService: PrismaService) {}

  private buildQrUrl(qrToken: string): string {
    const base = process.env.APPLICATION_URL ?? 'https://champino.org';
    return `${base}/loyalty/${qrToken}`;
  }

  async getMyCard(userId: string) {
    const card = await this.prismaService.loyaltyCard.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        qrToken: randomUUID(),
        totalOrders: 0,
        discountPct: 0,
      },
    });
    return { ...card, qrUrl: this.buildQrUrl(card.qrToken) };
  }

  async getCardByToken(qrToken: string) {
    const card = await this.prismaService.loyaltyCard.findUnique({
      where: { qrToken },
      include: {
        user: {
          select: { id: true, username: true, email: true, phoneNumber: true },
        },
      },
    });
    if (!card) return null;
    return { ...card, qrUrl: this.buildQrUrl(card.qrToken) };
  }

  async incrementOrderCount(userId: string): Promise<void> {
    const card = await this.prismaService.loyaltyCard.upsert({
      where: { userId },
      update: { totalOrders: { increment: 1 } },
      create: {
        userId,
        qrToken: randomUUID(),
        totalOrders: 1,
        discountPct: 0,
      },
    });

    const newPct = calcDiscount(card.totalOrders);
    if (newPct !== card.discountPct) {
      await this.prismaService.loyaltyCard.update({
        where: { userId },
        data: { discountPct: newPct },
      });
    }
  }

  async incrementByQrToken(qrToken: string) {
    const card = await this.prismaService.loyaltyCard.findUnique({
      where: { qrToken },
    });
    if (!card) return null;

    const updated = await this.prismaService.loyaltyCard.update({
      where: { qrToken },
      data: { totalOrders: { increment: 1 } },
    });

    const newPct = calcDiscount(updated.totalOrders);
    const finalCard =
      newPct !== updated.discountPct
        ? await this.prismaService.loyaltyCard.update({
            where: { qrToken },
            data: { discountPct: newPct },
          })
        : updated;

    return { ...finalCard, qrUrl: this.buildQrUrl(finalCard.qrToken) };
  }

  async incrementByQrTokenIdempotent(qrToken: string, operationId: string) {
    const card = await this.prismaService.loyaltyCard.findUnique({
      where: { qrToken },
    });
    if (!card) return null;

    try {
      const finalCard = await this.prismaService.$transaction(async tx => {
        await tx.loyaltyAccrualOperation.create({
          data: {
            operationId,
            loyaltyCardId: card.id,
          },
        });

        const updatedCard = await tx.loyaltyCard.update({
          where: { id: card.id },
          data: { totalOrders: { increment: 1 } },
        });

        const newPct = calcDiscount(updatedCard.totalOrders);
        if (newPct !== updatedCard.discountPct) {
          return tx.loyaltyCard.update({
            where: { id: card.id },
            data: { discountPct: newPct },
          });
        }

        return updatedCard;
      });

      return { ...finalCard, qrUrl: this.buildQrUrl(finalCard.qrToken) };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingCard = await this.prismaService.loyaltyCard.findUnique({
          where: { qrToken },
        });
        if (!existingCard) return null;
        return {
          ...existingCard,
          qrUrl: this.buildQrUrl(existingCard.qrToken),
        };
      }

      throw error;
    }
  }

  applyDiscount(
    total: number,
    discountPct: number,
  ): { finalTotal: number; savedAmount: number } {
    const savedAmount = +(total * (discountPct / 100)).toFixed(2);
    const finalTotal = +(total - savedAmount).toFixed(2);
    return { finalTotal, savedAmount };
  }
}
