import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

interface ScoreResponse {
  score: number;
}

export interface ScoreInput {
  resumeText: string;
  jobDescription: string;
}

/**
 * Thin client for the Python ml-service POST /score endpoint. The Groq
 * embedding call lives in Python; this just ships text over HTTP and reads
 * back a 0-100 score.
 */
@Injectable()
export class MlScoringClient {
  private readonly logger = new Logger(MlScoringClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.getOrThrow<string>('ML_SERVICE_URL');
  }

  async score(input: ScoreInput): Promise<number> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<ScoreResponse>(`${this.baseUrl}/score`, {
          resume_text: input.resumeText,
          job_description: input.jobDescription,
        }),
      );
      return data.score;
    } catch (err) {
      const axiosErr = err as AxiosError;
      // Surface the upstream status/body so failed Bull attempts are diagnosable.
      this.logger.error(
        `ml-service /score failed: ${axiosErr.message} (status ${axiosErr.response?.status ?? 'n/a'})`,
      );
      // Re-throw so the processor's failure path runs and Bull retries.
      throw new Error('ml-service scoring request failed');
    }
  }
}
