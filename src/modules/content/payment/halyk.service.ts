import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class HalykService {
  private readonly logger = new Logger(HalykService.name);
  private readonly http: AxiosInstance;
  private readonly terminalId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.terminalId =
      this.configService.getOrThrow<string>('HALYK_TERMINAL_ID');
    this.clientId = this.configService.getOrThrow<string>('HALYK_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>(
      'HALYK_CLIENT_SECRET',
    );

    this.http = axios.create({
      baseURL: this.configService.getOrThrow<string>('HALYK_API_URL'),
      timeout: 15000,
    });
  }

  private async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');
    const { data } = await this.http.post(
      '/v1/auth/oauth/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    return data.access_token as string;
  }

  async createInvoice(params: {
    orderId: string;
    amount: number;
    description?: string;
    backUrl: string;
    failureUrl: string;
  }) {
    try {
      const token = await this.getAccessToken();

      const payload = {
        amount: params.amount,
        currency: 'KZT',
        terminal: this.terminalId,
        orderId: params.orderId,
        description: params.description ?? `Оплата заказа ${params.orderId}`,
        postLink: params.backUrl,
        failurePostLink: params.failureUrl,
        language: 'RUS',
        cardSave: false,
      };

      const { data } = await this.http.post('/v1/invoices', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return {
        invoiceId: data.id as string,
        halykOrderId: params.orderId,
        formUrl: `${this.configService.getOrThrow('HALYK_FORM_URL')}?invoiceId=${data.id}`,
        raw: data,
      };
    } catch (error: any) {
      this.logger.error(
        'Halyk createInvoice error',
        error?.response?.data ?? error.message,
      );
      throw error;
    }
  }

  async getInvoiceStatus(invoiceId: string) {
    try {
      const token = await this.getAccessToken();
      const { data } = await this.http.get(`/v1/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const paid: boolean = data.status === 'PAID';
      return {
        paid,
        rrn: data.rrn as string | undefined,
        approvalCode: data.approvalCode as string | undefined,
        terminalId: data.terminal as string | undefined,
        raw: data,
      };
    } catch (error: any) {
      this.logger.error(
        'Halyk getInvoiceStatus error',
        error?.response?.data ?? error.message,
      );
      throw error;
    }
  }

  async refundInvoice(invoiceId: string, amount: number) {
    try {
      const token = await this.getAccessToken();
      const { data } = await this.http.post(
        `/v1/invoices/${invoiceId}/refund`,
        { amount, currency: 'KZT' },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return data;
    } catch (error: any) {
      this.logger.error(
        'Halyk refundInvoice error',
        error?.response?.data ?? error.message,
      );
      throw error;
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.clientSecret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  }
}
