import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  client!: RedisClientType;
  private connectPromise: Promise<void> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.client = createClient({
      url: configService.getOrThrow<string>('REDIS_URI'),
    });

    this.client.on('connect', () => this.logger.log('✅ Redis connected'));
    this.client.on('error', err =>
      this.logger.error('❌ Redis connection error', err),
    );
    this.client.on('end', () => this.logger.warn('⚠️ Redis connection closed'));
  }

  async onModuleInit() {
    this.connectPromise = this.client.connect();
    await this.connectPromise;
  }

  async waitForConnection(): Promise<void> {
    if (this.connectPromise) {
      await this.connectPromise;
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('👋 Redis disconnected');
  }
}
