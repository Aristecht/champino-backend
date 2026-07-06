import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  client!: RedisClientType;
  private connectPromise: Promise<RedisClientType | null>;
  private connected = false;

  constructor(private readonly configService: ConfigService) {
    const redisUri = configService.get<string>('REDIS_URI');
    if (!redisUri) {
      this.logger.warn('⚠️ REDIS_URI not set – sessions will not be persisted');
      this.connectPromise = Promise.resolve(null);
      return;
    }

    this.client = createClient({
      url: redisUri,
      socket: {
        connectTimeout: 5_000, // 5s timeout
        reconnectStrategy: false, // don't auto-reconnect
      },
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log('✅ Redis connected');
    });
    this.client.on('error', err =>
      this.logger.error('❌ Redis connection error', err),
    );
    this.client.on('end', () => {
      this.connected = false;
      this.logger.warn('⚠️ Redis connection closed');
    });

    this.connectPromise = this.client.connect().catch(err => {
      this.logger.error(
        '❌ Redis connection failed – continuing without Redis',
        err,
      );
      // Allow app to start without Redis
      return null;
    });
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async waitForConnection(): Promise<void> {
    try {
      await this.connectPromise;
    } catch {
      this.logger.warn(
        '⚠️ Redis unavailable – proceeding without session store',
      );
    }
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.client.quit();
      this.logger.log('👋 Redis disconnected');
    }
  }
}
