import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteObjectCommand,
  type DeleteObjectCommandInput,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client | null = null;
  private bucket: string = '';
  private isAvailable: boolean = false;

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  private initialize(): void {
    const endpoint = this.configService.get<string>('S3_ENPOINT');
    const region = this.configService.get<string>('S3_REGION');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );
    const bucket = this.configService.get<string>('S3_BUCKET_NAME');

    if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
      this.logger.warn(
        '⚠️ S3 storage not configured. Some file operations will be unavailable.',
      );
      return;
    }

    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });

    this.bucket = bucket;
    this.isAvailable = true;
    this.logger.log('✅ S3 storage initialized');
  }

  async upload(buffer: Buffer, key: string, mimetype: string) {
    if (!this.isAvailable || !this.client) {
      throw new Error('S3 storage not available');
    }

    const command: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: String(key),
      Body: buffer,
      ContentType: mimetype,
    };

    await this.client.send(new PutObjectCommand(command));
  }

  async remove(key: string) {
    if (!this.isAvailable || !this.client) {
      throw new Error('S3 storage not available');
    }

    const command: DeleteObjectCommandInput = {
      Bucket: this.bucket,
      Key: String(key),
    };

    await this.client.send(new DeleteObjectCommand(command));
  }

  getFileUrl(key: string): string {
    if (!this.isAvailable || !this.client) {
      throw new Error('S3 storage not available');
    }

    const endpoint = this.configService.getOrThrow<string>('S3_ENPOINT');
    return `${endpoint}/${this.bucket}/${key}`;
  }
}
