import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  client!: RedisClientType;
  private connectPromise: Promise<RedisClientType>;

  constructor(private readonly configService: ConfigService) {
    this.client = createClient({
      url: configService.getOrThrow<string>('REDIS_URI'),
    });

    this.client.on('connect', () => this.logger.log('✅ Redis connected'));
    this.client.on('error', err =>
      this.logger.error('❌ Redis connection error', err),
    );
    this.client.on('end', () => this.logger.warn('⚠️ Redis connection closed'));

    // Подключаемся к Redis сразу (в конструкторе),
    // т.к. session store (main.ts) использует redis.client до app.listen()
    this.connectPromise = this.client.connect();
  }

  async waitForConnection(): Promise<void> {
    await this.connectPromise;
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('👋 Redis disconnected');
  }
}
