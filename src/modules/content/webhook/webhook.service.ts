import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { HalykService } from '../payment/halyk.service';
import {
  OrderStatus,
  PaymentsStatus,
} from '../../../../prisma/generated/prisma/enums';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly halykService: HalykService,
  ) {}

  async handleKaspiWebhook(body: {
    OrderId: string;
    Status: string;
    TransactionId?: string;
    Amount?: number;
  }) {
    const { OrderId, Status, TransactionId } = body;

    const payment = await this.prismaService.payment.findFirst({
      where: { kaspiOrderId: OrderId },
      include: { order: true },
    });

    if (!payment) {
      this.logger.warn(
        `Kaspi webhook: payment not found for OrderId=${OrderId}`,
      );
      return { ok: true };
    }

    if (payment.status === PaymentsStatus.SUCCEEDED) {
      return { ok: true }; // idempotent
    }

    if (Status === 'PAID') {
      await this.prismaService.$transaction([
        this.prismaService.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentsStatus.SUCCEEDED,
            kaspiPaymentId: TransactionId,
            paidAt: new Date(),
            rawResponse: body as any,
          },
        }),
        this.prismaService.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.PAID },
        }),
      ]);
      this.logger.log(`Kaspi: order ${payment.orderId} marked PAID`);
    } else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(Status)) {
      await this.prismaService.payment.update({
        where: { id: payment.id },
        data: { status: PaymentsStatus.FAILED, rawResponse: body as any },
      });
    }

    return { ok: true };
  }

  async handleHalykWebhook(rawBody: string, signature: string) {
    const valid = this.halykService.verifyWebhookSignature(rawBody, signature);
    if (!valid) {
      this.logger.warn('Halyk webhook: invalid signature');
      return { ok: false, error: 'invalid_signature' };
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return { ok: false, error: 'bad_json' };
    }

    const invoiceId: string | undefined = body.invoiceId ?? body.id;
    if (!invoiceId) return { ok: true };

    const payment = await this.prismaService.payment.findFirst({
      where: { halykInvoiceId: invoiceId },
      include: { order: true },
    });

    if (!payment) {
      this.logger.warn(
        `Halyk webhook: payment not found for invoiceId=${invoiceId}`,
      );
      return { ok: true };
    }

    if (payment.status === PaymentsStatus.SUCCEEDED) {
      return { ok: true };
    }

    const halykStatus: string = body.status ?? '';

    if (halykStatus === 'PAID') {
      await this.prismaService.$transaction([
        this.prismaService.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentsStatus.SUCCEEDED,
            halykRrn: body.rrn,
            halykApprovalCode: body.approvalCode,
            halykTerminalId: body.terminal,
            paidAt: new Date(),
            rawResponse: body,
          },
        }),
        this.prismaService.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.PAID },
        }),
      ]);
      this.logger.log(`Halyk: order ${payment.orderId} marked PAID`);
    } else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(halykStatus)) {
      await this.prismaService.payment.update({
        where: { id: payment.id },
        data: { status: PaymentsStatus.FAILED, rawResponse: body },
      });
    }

    return { ok: true };
  }
}
