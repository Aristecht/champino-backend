import { Field, ObjectType, Int } from '@nestjs/graphql';
import type { SyncStatus } from '../rosta-sync.service';

@ObjectType()
export class RostaSyncStatusModel implements SyncStatus {
  @Field()
  isRunning: boolean;

  @Field(() => Int, {
    description: 'Прогресс синхронизации (0-100%)',
  })
  progress: number;

  @Field({
    description: 'Текущий статус',
  })
  status: string;

  @Field({
    nullable: true,
    description: 'Ошибка, если она произошла',
  })
  error?: string;

  @Field({
    nullable: true,
    description: 'Время запуска синхронизации',
  })
  startedAt?: Date;
}
