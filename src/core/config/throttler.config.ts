import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

import { RedisThrottlerStorage } from '../redis/redis-throttler.storage';

export function getThrottlerConfig(
  configService: ConfigService,
): ThrottlerModuleOptions {
  const throttlers = [
    {
      name: 'default',
      ttl: 60 * 1000, // 1 минута
      limit: 60, // 60 запросов в минуту — общий лимит на GraphQL
    },
    {
      name: 'auth',
      ttl: 15 * 60 * 1000, // 15 минут
      limit: 10, // 10 попыток
    },
    {
      name: 'strict',
      ttl: 60 * 60 * 1000, // 1 час
      limit: 3,
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
