import {
  Injectable,
  NestMiddleware,
  RequestTimeoutException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware для принудительного таймаута запросов.
 * Если запрос обрабатывается дольше указанного времени,
 * middleware отправляет 408 Request Timeout.
 *
 * Это критично для Express 5 + Cloudflare, чтобы:
 * - избежать "висящих" запросов при падении БД/Redis
 * - предотвратить 502 Bad Gateway от Cloudflare из-за
 *   незавершённых ответов от origin
 */
@Injectable()
export class RequestTimeoutMiddleware implements NestMiddleware {
  private readonly defaultTimeout = 25_000; // 25 секунд

  use(req: Request, res: Response, next: NextFunction) {
    const timeout = this.getTimeout(req) ?? this.defaultTimeout;

    const timer = setTimeout(() => {
      if (res.writableEnded) return;

      res.status(408).json({
        statusCode: 408,
        message: 'Request Timeout',
        timestamp: new Date().toISOString(),
        path: req.url,
      });
    }, timeout);

    // Очищаем таймер после завершения запроса
    res.on('close', () => clearTimeout(timer));
    res.on('finish', () => clearTimeout(timer));

    next();
  }

  /**
   * Можно задать per-route timeout через res.locals
   * Например: res.locals.timeout = 60_000
   */
  private getTimeout(req: Request): number | undefined {
    return (req as any).locals?.timeout;
  }
}
