import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('kaspi')
  @HttpCode(HttpStatus.OK)
  kaspiWebhook(@Body() body: any) {
    return this.webhookService.handleKaspiWebhook(body);
  }

  @Post('halyk')
  @HttpCode(HttpStatus.OK)
  halykWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string,
  ) {
    const rawBody = req.rawBody?.toString('utf-8') ?? '';
    return this.webhookService.handleHalykWebhook(rawBody, signature ?? '');
  }
}
