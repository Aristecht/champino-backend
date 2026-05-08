import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../../core/prisma/prisma.service';

interface RostaGroup {
  id: string;
  name: string;
  parent_id: string | null;
  updated_at: string;
}

interface RostaItem {
  id: string;
  name: string;
  price: number | string | null;
  stock?: number | string | null;
  remains?: number | string | null;
  remain?: number | string | null;
  qty?: number | string | null;
  quantity?: number | string | null;
  type_id: string;
  unit_id: string;
  parent_id: string | null;
  updated_at: string;
}

interface RostaPage<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

@Injectable()
export class RostaSyncService {
  private readonly logger = new Logger(RostaSyncService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.ROSTA_API_KEY;
    const baseURL =
      process.env.ROSTA_API_URL ?? 'https://next.rosta.kz/api/client/public';

    if (!apiKey) {
      this.logger.warn('ROSTA_API_KEY is missing. Sync requests will fail.');
    }

    this.http = axios.create({
      baseURL,
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30_000,
    });
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 200);
  }

  private async fetchAllPages<T>(path: string): Promise<T[]> {
    const results: T[] = [];
    let page = 1;

    while (true) {
      const { data } = await this.http.get<RostaPage<T>>(path, {
        params: { page, per_page: 100 },
      });
      results.push(...data.data);
      if (page >= data.meta.last_page) break;
      page++;
    }

    return results;
  }

  private toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(',', '.').trim();
      if (!normalized) return fallback;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    return fallback;
  }

  private parsePrice(item: RostaItem): number {
    return this.toNumber(item.price, 0);
  }

  private parseStock(item: RostaItem): number {
    const raw =
      item.stock ??
      item.remains ??
      item.remain ??
      item.qty ??
      item.quantity ??
      0;

    const parsed = this.toNumber(raw, 0);
    return parsed < 0 ? 0 : Math.floor(parsed);
  }

  async syncCategories(): Promise<Map<string, string>> {
    const groups = await this.fetchAllPages<RostaGroup>('/items/groups');

    const rostaToDbId = new Map<string, string>();

    const sorted = [
      ...groups.filter(g => !g.parent_id),
      ...groups.filter(g => g.parent_id),
    ];

    for (const group of sorted) {
      const slug = this.slugify(group.name) || group.id;

      let parentId: string | null = null;
      if (group.parent_id) {
        parentId = rostaToDbId.get(group.parent_id) ?? null;
      }

      const category = await this.prisma.category.upsert({
        where: { rostaId: group.id },
        create: {
          name: group.name,
          slug,
          rostaId: group.id,
          parentId,
        },
        update: {
          name: group.name,
          parentId,
        },
      });

      rostaToDbId.set(group.id, category.id);
    }

    return rostaToDbId;
  }

  async syncProducts(
    categoryMap: Map<string, string>,
  ): Promise<Map<string, string>> {
    const items = await this.fetchAllPages<RostaItem>('/items');

    const rostaToDbId = new Map<string, string>();

    for (const item of items) {
      const categoryId = item.parent_id
        ? (categoryMap.get(item.parent_id) ?? null)
        : null;

      const price = this.parsePrice(item);
      const stock = this.parseStock(item);

      const product = await this.prisma.product.upsert({
        where: { rostaId: item.id },
        create: {
          name: item.name,
          price,
          isPublished: true,
          isDraft: false,
          stock,
          categoryId,
          rostaId: item.id,
        },
        update: {
          name: item.name,
          price,
          stock,
          categoryId,
        },
      });

      rostaToDbId.set(item.id, product.id);
    }

    return rostaToDbId;
  }
  async syncAll(): Promise<void> {
    this.logger.log('ROSTA sync started');
    const t0 = Date.now();

    try {
      const categoryMap = await this.syncCategories();
      this.logger.log(`Categories synced: ${categoryMap.size}`);

      const productsMap = await this.syncProducts(categoryMap);
      this.logger.log(`Products synced: ${productsMap.size}`);

      this.logger.log(`ROSTA sync done in ${Date.now() - t0}ms`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        this.logger.warn(
          'ROSTA sync skipped: invalid or not-yet-issued ROSTA_API_KEY (401)',
        );
        return;
      }

      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`ROSTA sync failed: ${message}`);
    }
  }
}
