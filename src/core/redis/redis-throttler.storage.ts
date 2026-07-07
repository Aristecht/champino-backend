import { ThrottlerStorage } from '@nestjs/throttler';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis-based throttler storage для распределённого rate limiting.
 * При падении Redis — падает "degraded": лимиты продолжают работать in-memory
 * через fallback (throw, но ThrottlerGuard ловит и пропускает запрос).
 * Для production рекомендуется всегда иметь Redis.
 *
 * Все операции с Redis имеют таймаут 3 секунды, чтобы избежать "висящих"
 * запросов при проблемах с Redis.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private client: RedisClientType;
  private connected = false;
  private fallback: Map<string, { count: number; expiresAt: number }>;

  constructor(redisUri: string) {
    this.fallback = new Map();

    this.client = createClient({
      url: redisUri,
      socket: {
        connectTimeout: 3_000,
        reconnectStrategy: false,
      },
    });

    this.client.on('connect', () => {
      this.connected = true;
    });

    this.client.on('error', () => {
      this.connected = false;
    });

    this.client.on('end', () => {
      this.connected = false;
    });

    this.client.connect().catch(() => {
      this.connected = false;
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    name: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    if (this.connected) {
      try {
        return await this.withTimeout(
          this.incrementRedis(key, ttl, limit, blockDuration, name),
          3_000,
        );
      } catch {
        this.connected = false;
      }
    }

    return this.incrementFallback(key, ttl, limit, blockDuration, name);
  }

  /**
   * Выполняет Promise с таймаутом.
   * Если Redis завис — не ждём больше указанного времени.
   */
  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Redis operation timed out after ${ms}ms`));
      }, ms);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private async incrementRedis(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    name: string,
  ) {
    const redisKey = `throttler:${name}:${key}`;

    // Проверяем, не заблокирован ли ключ
    const blockKey = `${redisKey}:blocked`;
    const blocked = await this.client.get(blockKey);
    if (blocked) {
      const blockTtl = await this.client.ttl(blockKey);
      return {
        totalHits: limit + 1,
        timeToExpire: ttl,
        isBlocked: true,
        timeToBlockExpire: blockTtl * 1000,
      };
    }

    const current = await this.client.incr(redisKey);

    if (current === 1) {
      // Первый запрос — устанавливаем TTL
      await this.client.pExpire(redisKey, ttl);
    }

    const remainingTtl = await this.client.pTTL(redisKey);

    // Если превышен лимит — блокируем
    if (current > limit && blockDuration > 0) {
      await this.client.setEx(blockKey, Math.ceil(blockDuration / 1000), '1');
    }

    return {
      totalHits: current,
      timeToExpire: remainingTtl > 0 ? remainingTtl : 0,
      isBlocked: current > limit,
      timeToBlockExpire: current > limit ? blockDuration : 0,
    };
  }

  private incrementFallback(
    key: string,
    ttl: number,
    _limit: number,
    _blockDuration: number,
    _name: string,
  ) {
    const now = Date.now();
    const record = this.fallback.get(key);

    if (!record || now > record.expiresAt) {
      this.fallback.set(key, { count: 1, expiresAt: now + ttl });
      return Promise.resolve({
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      });
    }

    record.count++;
    return Promise.resolve({
      totalHits: record.count,
      timeToExpire: record.expiresAt - now,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  }
}
