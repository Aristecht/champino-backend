import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { RedisStore } from 'connect-redis';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';

import { CoreModule } from './core/core.module';
import { RedisService } from './core/redis/redis.service';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { RequestTimeoutMiddleware } from './shared/middlewares/request-timeout.middleware';
import { ms } from './shared/utils/ms.util';
import { parseBoolean } from './shared/utils/parse-boolean.util';

// Глобальные обработчики для предотвращения падения процесса
process.on('uncaughtException', error => {
  console.error('[uncaughtException]', error);
});

process.on('unhandledRejection', reason => {
  console.error('[unhandledRejection]', reason);
});

async function bootstrap() {
  const app = await NestFactory.create(CoreModule, {
    rawBody: true,
  });

  const config = app.get(ConfigService);
  const redis = app.get(RedisService);
  const apiPrefix = config.get<string>('API_PREFIX')?.replace(/^\/+|\/+$/g, '');

  // Ждём подключения Redis перед настройкой сессий (с таймаутом)
  await redis.waitForConnection();

  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }

  app.use(cookieParser(config.getOrThrow<string>('COOKIE_SECRET')));
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const sessionSecure = parseBoolean(
    config.getOrThrow<string>('SESSION_SECURE'),
  );

  app.use(
    session({
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      name: config.getOrThrow<string>('SESSION_NAME'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        domain: config.get<string>('SESSION_DOMAIN') || undefined,
        maxAge: ms(config.getOrThrow<string | number>('SESSION_MAX_AGE')),
        httpOnly: parseBoolean(config.getOrThrow<string>('SESSION_HTTP_ONLY')),
        secure: sessionSecure,
        sameSite: sessionSecure ? 'none' : 'lax',
      },
      store: new RedisStore({
        client: redis.client,
        prefix: config.getOrThrow<string>('SESSION_FOLDER'),
        // Таймаут на операции с Redis: 5s (connect-redis использует
        // команду PING перед операциями, если подключение проблемное)
        disableTTL: false,
      }),
    }),
  );

  app.use(passport.initialize());
  app.enableCors({
    origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
    credentials: true,
    exposedHeaders: ['Set-Cookie'],
  });

  // Глобальный таймаут запросов (25s) — ДО health check и GraphQL
  app.use(new RequestTimeoutMiddleware().use);

  // Health check endpoint
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  console.log('[bootstrap] runtime config', {
    nodeEnv: config.get<string>('NODE_ENV'),
    apiPrefix: apiPrefix || '',
    allowedOrigin: config.get<string>('ALLOWED_ORIGIN'),
    applicationUrl: config.get<string>('APPLICATION_URL'),
    googleCallbackUrl: config.get<string>('GOOGLE_CALLBACK_URL'),
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  const applicationPort = config.get<number>('APPLICATION_PORT');
  const platformPort = process.env.PORT ? Number(process.env.PORT) : undefined;
  const port = platformPort ?? applicationPort ?? 4000;

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server listening on http://0.0.0.0:${port}`);
}

bootstrap().catch(err => {
  console.error('❌ Fatal error during bootstrap:', err);
  process.exit(1);
});
