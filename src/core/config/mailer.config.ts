import { type MailerOptions } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function getMailerConfig(configService: ConfigService): MailerOptions {
  const logger = new Logger('MailerConfig');

  const host = configService.get<string>('MAIL_HOST');
  const port = configService.get<number>('MAIL_PORT');
  const login = configService.get<string>('MAIL_LOGIN');
  const password = configService.get<string>('MAIL_PASSWORD');
  const fromName = configService.get<string>('MAIL_FROM_NAME');
  const fromAddress = configService.get<string>('MAIL_FROM_ADDRESS');

  if (!host || !port || !login || !password || !fromName || !fromAddress) {
    logger.warn(
      '⚠️ Mailer not fully configured. Email sending will be unavailable.',
    );

    return {
      transport: {
        host: host || 'localhost',
        port: port || 1025,
        secure: false,
        auth: { user: login || '', pass: password || '' },
      },
      defaults: {
        from: `"${fromName || 'No Reply'}" <${fromAddress || 'noreply@localhost'}>`,
      },
    };
  }

  return {
    transport: {
      host,
      port,
      secure: false,
      auth: { user: login, pass: password },
    },
    defaults: {
      from: `"${fromName}" <${fromAddress}>`,
    },
  };
}
