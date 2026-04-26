import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class KaspiService {
  private readonly logger = new Logger(KaspiService.name);
  private readonly http: AxiosInstance;
  private readonly merchantId: string;

  constructor(private readonly configService: ConfigService) {
    this.merchantId =
      this.configService.getOrThrow<string>('KASPI_MERCHANT_ID');

    this.http = axios.create({
      baseURL: this.configService.getOrThrow<string>('KASPI_API_URL'),
      headers: {
        'Content-Type': 'application/json',
        'X-Auth': this.configService.getOrThrow<string>('KASPI_API_KEY'),
      },
      timeout: 15000,
    });
  }

  async createQrPayment(params: {
    orderId: string;
    amount: number;
    description?: string;
  }) {
    try {
      const payload = {
        MerchantId: this.merchantId,
        OrderId: params.orderId,
        Amount: params.amount,
        Currency: 'KZT',
        Description: params.description ?? `Оплата заказа ${params.orderId}`,
        ExpiryMinutes: 15,
      };

      const { data } = await this.http.post('/payment/qr/create', payload);

      const qrToken = data.QrToken as string;

      return {
        kaspiOrderId: data.OrderId as string,
        qrToken,
        qrUrl: data.QrUrl as string,
        paymentUrl: `https://pay.kaspi.kz/pay/${qrToken}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };
    } catch (error: any) {
      this.logger.error(
        'Kaspi createQrPayment error',
        error?.response?.data ?? error.message,
      );
      throw error;
    }
  }

  async checkPaymentStatus(kaspiOrderId: string) {
    try {
      const { data } = await this.http.get(`/payment/qr/status`, {
        params: { OrderId: kaspiOrderId, MerchantId: this.merchantId },
      });

      const paid: boolean = data.Status === 'PAID';
      return {
        paid,
        kaspiPaymentId: data.PaymentId as string | undefined,
        raw: data,
      };
    } catch (error: any) {
      this.logger.error(
        'Kaspi checkPaymentStatus error',
        error?.response?.data ?? error.message,
      );
      throw error;
    }
  }

  async refundPayment(kaspiPaymentId: string, amount: number) {
    try {
      const { data } = await this.http.post('/payment/refund', {
        MerchantId: this.merchantId,
        PaymentId: kaspiPaymentId,
        Amount: amount,
      });
      return data;
    } catch (error: any) {
      this.logger.error(
        'Kaspi refundPayment error',
        error?.response?.data ?? error.message,
      );
      throw error;
    }
  }
}
