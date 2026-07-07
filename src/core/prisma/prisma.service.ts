import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../../prisma/generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const dbUrl = new URL(process.env.POSTGRES_URI!);
    // Принудительный таймаут на уровне PostgreSQL (20s на запрос)
    dbUrl.searchParams.set('statement_timeout', '20000');
    // Таймаут на установку соединения (10s)
    dbUrl.searchParams.set('connect_timeout', '10');
    // Таймаут на idle транзакцию (30s) — закрывает «забытые» транзакции
    dbUrl.searchParams.set('idle_in_transaction_session_timeout', '30000');

    const pool = new Pool({
      connectionString: dbUrl.toString(),
      max: 20,
      idleTimeoutMillis: 30_000,
    });
    const adapter = new PrismaPg(pool);

    super({ adapter });

    pool.on('error', err => {
      this.logger.error('❌ Unexpected pool error', err);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('👋 Database disconnected');
  }
}
