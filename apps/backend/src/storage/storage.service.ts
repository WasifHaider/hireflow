import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeClientOptions } from '@supabase/realtime-js';
import ws from 'ws';

const RESUMES_BUCKET = 'resumes';

export interface UploadResumeParams {
  companyId: string;
  jobId: string;
  candidateId: string;
  fileBuffer: Buffer;
  originalFilename: string;
  mimeType: string;
}

export interface UploadResumeResult {
  path: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        transport: ws as unknown as NonNullable<
          RealtimeClientOptions['transport']
        >,
      },
    });
  }

  async uploadResume(params: UploadResumeParams): Promise<UploadResumeResult> {
    const {
      companyId,
      jobId,
      candidateId,
      fileBuffer,
      originalFilename,
      mimeType,
    } = params;

    const sanitizedFilename = this.sanitizeFilename(originalFilename);
    const path = `${companyId}/${jobId}/${candidateId}/${Date.now()}-${sanitizedFilename}`;

    const { error } = await this.supabase.storage
      .from(RESUMES_BUCKET)
      .upload(path, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Failed to upload resume to ${path}: ${error.message}`);
      throw new InternalServerErrorException('Failed to upload resume');
    }

    return { path, size: fileBuffer.length };
  }

  async deleteResume(path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(RESUMES_BUCKET)
      .remove([path]);

    if (error) {
      this.logger.error(
        `Failed to delete resume at ${path} during rollback: ${error.message}`,
      );
    }
  }

  async getSignedUrl(
    path: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(RESUMES_BUCKET)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      this.logger.error(
        `Failed to create signed URL for ${path}: ${error?.message ?? 'No URL returned'}`,
      );
      throw new InternalServerErrorException('Failed to generate resume URL');
    }

    return data.signedUrl;
  }

  /**
   * Download a resume's raw bytes. Mints a short-lived signed URL and fetches
   * it rather than streaming through the SDK, so the same tenant-checked URL
   * path is exercised everywhere and the bucket stays private.
   */
  async downloadResume(path: string): Promise<Buffer> {
    const signedUrl = await this.getSignedUrl(path, 120);

    const response = await fetch(signedUrl);
    if (!response.ok) {
      this.logger.error(
        `Failed to download resume at ${path}: HTTP ${response.status}`,
      );
      throw new InternalServerErrorException('Failed to download resume');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private sanitizeFilename(filename: string): string {
    const basename = filename.replace(/^.*[\\/]/, '');
    const stem = basename
      .replace(/\.pdf$/i, '')
      .replace(/\.\./g, '')
      .replace(/[/\\]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w.-]/g, '');

    const safeStem = stem || 'resume';
    return `${safeStem}.pdf`;
  }
}
