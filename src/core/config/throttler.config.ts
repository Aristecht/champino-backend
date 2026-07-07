import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

import { isDev } from '../../shared/utils/is-dev.util';
import { RedisThrottlerStorage } from '../redis/redis-throttler.storage';

export function getThrottlerConfig(
  configService: ConfigService,
): ThrottlerModuleOptions {
  const dev = isDev(configService);

  // В dev режиме лимиты выше, чтобы не мешать разработке
  const throttlers = [
    {
      name: 'default',
      ttl: 60 * 1000, // 1 минута
      limit: dev ? 600 : 200, // dev: 600/мин, prod: 200/мин
    },
    {
      name: 'auth',
      ttl: 15 * 60 * 1000, // 15 минут
      limit: dev ? 50 : 10, // dev: 50, prod: 10
    },
    {
      name: 'strict',
      ttl: 60 * 60 * 1000, // 1 час
      limit: dev ? 20 : 3,
    },
  ];

  const redisUri = configService.get<string>('REDIS_URI');

  // Если Redis доступен, используем его как распределённое хранилище throttling
  if (redisUri) {
    return {
      throttlers,
      storage: new RedisThrottlerStorage(redisUri),
    };
  }

  return { throttlers };
}
