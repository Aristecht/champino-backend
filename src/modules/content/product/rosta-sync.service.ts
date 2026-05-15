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

export interface SyncStatus {
  isRunning: boolean;
  progress: number; // 0-100
  status: string;
  error?: string;
  startedAt?: Date;
}

@Injectable()
export class RostaSyncService {
  private readonly logger = new Logger(RostaSyncService.name);
  private readonly http: AxiosInstance;
  private isSyncRunning = false;
  private isCancelled = false;
  private syncStatus: SyncStatus = {
    isRunning: false,
    progress: 0,
    status: 'idle',
  };

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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private collectGroupIds(groups: RostaGroup[], rootId: string): Set<string> {
    const ids = new Set<string>([rootId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const g of groups) {
        if (g.parent_id && ids.has(g.parent_id) && !ids.has(g.id)) {
          ids.add(g.id);
          changed = true;
        }
      }
    }
    return ids;
  }

  private getPageDelayMs(): number {
    const raw = process.env.ROSTA_PAGE_DELAY_MS;
    const parsed = raw ? Number(raw) : NaN;

    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }

    return 7_000;
  }

  private getPerPage(): number {
    const raw = process.env.ROSTA_PER_PAGE;
    const parsed = raw ? Number(raw) : NaN;

    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 100) {
      return Math.floor(parsed);
    }

    return 100;
  }

  private async fetchPage<T>(
    path: string,
    page: number,
  ): Promise<RostaPage<T>> {
    let retries = 0;

    while (retries < 5) {
      try {
        const { data } = await this.http.get<RostaPage<T>>(path, {
          params: { page, per_page: this.getPerPage() },
        });

        return data;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 429) {
          const retryAfterHeader = err.response.headers['retry-after'];
          const retryAfterMs = retryAfterHeader
            ? parseInt(retryAfterHeader, 10) * 1000
            : Math.min(15_000 * 2 ** retries, 60_000);

          this.logger.warn(
            `ROSTA 429 on ${path} page ${page}, retry ${retries + 1}/5 after ${retryAfterMs}ms`,
          );

          await this.sleep(retryAfterMs);
          retries++;
          continue;
        }

        throw err;
      }
    }

    throw new Error(
      `ROSTA rate limit exceeded for ${path} page ${page} after 5 retries`,
    );
  }

  private async fetchAllPages<T>(path: string): Promise<T[]> {
    const results: T[] = [];
    let page = 1;

    while (true) {
      const response = await this.fetchPage<T>(path, page);

      results.push(...response.data);
      if (page >= response.meta.last_page) break;
      page++;

      await this.sleep(this.getPageDelayMs());
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

  async syncCategories(
    groups: RostaGroup[],
    allowedGroupIds?: Set<string>,
  ): Promise<Map<string, string>> {
    const rostaToDbId = new Map<string, string>();

    const source = allowedGroupIds
      ? groups.filter(g => allowedGroupIds.has(g.id))
      : groups;

    const sorted = [
      ...source.filter(g => !g.parent_id),
      ...source.filter(g => g.parent_id),
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
    allowedGroupIds?: Set<string>,
  ): Promise<Map<string, string>> {
    const rostaToDbId = new Map<string, string>();
    let page = 1;

    while (true) {
      const response = await this.fetchPage<RostaItem>('/items', page);

      for (const item of response.data) {
        if (allowedGroupIds) {
          if (!item.parent_id || !allowedGroupIds.has(item.parent_id)) {
            continue;
          }
        }

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

      this.logger.log(
        `Products page ${page}/${response.meta.last_page} synced, total: ${rostaToDbId.size}`,
      );

      if (page >= response.meta.last_page) {
        break;
      }

      if (this.isCancelled) {
        this.logger.warn('ROSTA sync cancelled during products pagination');
        break;
      }

      page++;
      await this.sleep(this.getPageDelayMs());
    }

    return rostaToDbId;
  }
  async syncAll(): Promise<void> {
    if (this.isSyncRunning) {
      this.logger.warn('ROSTA sync skipped: previous sync is still running');
      return;
    }

    this.isSyncRunning = true;
    this.isCancelled = false;
    this.syncStatus = {
      isRunning: true,
      progress: 0,
      status: 'Запуск синхронизации...',
      startedAt: new Date(),
    };
    this.logger.log('ROSTA sync started');
    const t0 = Date.now();

    try {
      this.syncStatus.progress = 5;
      this.syncStatus.status = 'Загрузка групп Rosta...';
      const allGroups = await this.fetchAllPages<RostaGroup>('/items/groups');

      let allowedGroupIds: Set<string> | undefined;
      const syncGroupName = process.env.ROSTA_SYNC_GROUP?.trim();
      if (syncGroupName) {
        const rootGroup = allGroups.find(
          g => g.name.trim().toLowerCase() === syncGroupName.toLowerCase(),
        );
        if (!rootGroup) {
          const msg = `ROSTA_SYNC_GROUP="${syncGroupName}" не найдена среди групп Rosta. Синхронизация отменена.`;
          this.logger.error(msg);
          this.syncStatus.error = msg;
          return;
        } else {
          allowedGroupIds = this.collectGroupIds(allGroups, rootGroup.id);
          this.logger.log(
            `Фильтр по группе "${syncGroupName}": ${allowedGroupIds.size} групп (включая подгруппы)`,
          );
        }
      }

      this.syncStatus.progress = 10;
      this.syncStatus.status = 'Загрузка категорий...';
      const categoryMap = await this.syncCategories(allGroups, allowedGroupIds);
      this.logger.log(`Categories synced: ${categoryMap.size}`);

      if (this.isCancelled) {
        this.syncStatus.status = 'Синхронизация отменена';
        return;
      }

      this.syncStatus.progress = 50;
      this.syncStatus.status = `Загрузка товаров (${categoryMap.size} категорий)...`;
      const productsMap = await this.syncProducts(categoryMap, allowedGroupIds);
      this.logger.log(`Products synced: ${productsMap.size}`);

      if (this.isCancelled) {
        this.syncStatus.status = 'Синхронизация отменена';
        return;
      }

      this.syncStatus.progress = 100;
      this.syncStatus.status = `Готово: ${productsMap.size} товаров синхронизировано`;
      this.logger.log(`ROSTA sync done in ${Date.now() - t0}ms`);
    } catch (err) {
      if (this.isCancelled) {
        this.syncStatus.status = 'Синхронизация отменена';
        return;
      }

      if (axios.isAxiosError(err) && err.response?.status === 401) {
        this.logger.warn(
          'ROSTA sync skipped: invalid or not-yet-issued ROSTA_API_KEY (401)',
        );
        this.syncStatus.error = 'Ошибка: неверный ROSTA_API_KEY';
        return;
      }

      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`ROSTA sync failed: ${message}`);
      this.syncStatus.error = `Ошибка: ${message}`;
    } finally {
      this.isSyncRunning = false;
      setTimeout(() => {
        this.syncStatus = {
          isRunning: false,
          progress: 0,
          status: 'idle',
        };
      }, 2000);
    }
  }

  cancelSync(): void {
    if (!this.isSyncRunning) return;
    this.isCancelled = true;
    this.syncStatus.status = 'Отмена...';
    this.logger.warn('ROSTA sync cancellation requested');
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }
}
