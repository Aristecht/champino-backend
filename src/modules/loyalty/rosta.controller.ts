import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../../shared/guards/api-key.guard';
import { LoyaltyService } from './loyalty.service';

class ConfirmPurchaseDto {
  qrToken: string;
  operationId: string;
}

@UseGuards(ApiKeyGuard)
@Controller('loyalty/rosta')
export class RostaLoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  /**
   * Scan QR code — returns customer name and current discount.
   * Called by the cashier after scanning the customer's QR code.
   *
   * GET /api/loyalty/rosta/scan/:qrToken
   * Authorization: Bearer <ROSTA_LOYALTY_API_KEY>
   */
  @Get('scan/:qrToken')
  async scan(@Param('qrToken') qrToken: string) {
    // Support both raw UUID and full URL (e.g. https://champino.org/loyalty/UUID)
    const token = qrToken.includes('/')
      ? qrToken.split('/').filter(Boolean).pop()!
      : qrToken;

    const card = await this.loyaltyService.getCardByToken(token);
    if (!card) throw new NotFoundException('Карта лояльности не найдена');

    return {
      discountPct: card.discountPct,
      totalOrders: card.totalOrders,
      userName: card.user?.username ?? null,
      email: card.user?.email ?? null,
      phoneNumber: card.user?.phoneNumber ?? null,
    };
  }

  @Post('confirm')
  async confirm(@Body() body: ConfirmPurchaseDto) {
    const { qrToken, operationId } = body;

    if (!qrToken || !operationId) {
      throw new NotFoundException('qrToken и operationId обязательны');
    }

    // Support both raw UUID and full URL
    const token = qrToken.includes('/')
      ? qrToken.split('/').filter(Boolean).pop()!
      : qrToken;

    const card = await this.loyaltyService.incrementByQrTokenIdempotent(
      token,
      operationId,
    );
    if (!card) throw new NotFoundException('Карта лояльности не найдена');

    return {
      success: true,
      totalOrders: card.totalOrders,
      discountPct: card.discountPct,
    };
  }
}
