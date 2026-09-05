import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { GenerateJobDescriptionDto } from './dto/generate-job-description.dto';
import { GeneratedJobDescriptionDto } from './dto/generated-job-description.dto';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
// llama-3.3-70b-versatile was decommissioned by Groq (chat completions now
// 404 on that model id) — openai/gpt-oss-120b supports json_mode the same way.
const CHAT_MODEL = 'openai/gpt-oss-120b';

interface GroqChatChoice {
  message?: { content?: string };
}
interface GroqChatResponse {
  choices?: GroqChatChoice[];
}

/**
 * Thin client for Groq's OpenAI-compatible chat completions endpoint, used to
 * generate job-posting copy and dashboard suggestions. Separate concern from
 * MlScoringClient (which talks to our own ml-service for resume/JD embedding
 * scoring) — this calls Groq directly for text generation.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.apiKey = config.getOrThrow<string>('GROQ_API_KEY');
  }

  async generateJobDescription(
    dto: GenerateJobDescriptionDto,
  ): Promise<GeneratedJobDescriptionDto> {
    const content = await this.chatJson([
      {
        role: 'system',
        content:
          'You are a recruiting copywriter. Respond with ONLY a single valid JSON object, no markdown fences, no commentary.',
      },
      { role: 'user', content: this.buildJobDescriptionPrompt(dto) },
    ]);

    return this.parseJobDescriptionResponse(content);
  }

  /**
   * Short, actionable suggestions derived from the recruiter's own dashboard
   * numbers. Non-critical by design — callers should treat a thrown error as
   * "no suggestions right now" rather than a hard failure.
   */
  async generateDashboardSuggestions(stats: {
    activeJobs: number;
    totalApplications: number;
    avgAiScore: number;
    awaitingReview: number;
    pipeline: Record<string, number>;
  }): Promise<string[]> {
    const content = await this.chatJson([
      {
        role: 'system',
        content:
          'You are a hiring analytics assistant. Respond with ONLY a single valid JSON object of the form {"suggestions": ["...", "..."]}, no markdown fences, no commentary. Give 2-3 short (under 20 words), specific, actionable suggestions.',
      },
      {
        role: 'user',
        content: [
          'Here is a recruiter\'s current hiring dashboard:',
          `Active jobs: ${stats.activeJobs}`,
          `Total applications: ${stats.totalApplications}`,
          `Average AI fit score: ${stats.avgAiScore}`,
          `Applications awaiting review: ${stats.awaitingReview}`,
          `Pipeline by stage: ${JSON.stringify(stats.pipeline)}`,
          '',
          'Suggest 2-3 concrete next actions for this recruiter based on these numbers.',
        ].join('\n'),
      },
    ]);

    return this.parseSuggestionsResponse(content);
  }

  /**
   * Short outreach message (subject + body) for a candidate, written by the
   * agent copilot's draft_outreach tool. Non-critical in the same sense as
   * dashboard suggestions — the caller should surface a plain error to the
   * chat trace rather than treat it as fatal.
   */
  async generateOutreachMessage(input: {
    candidateName: string;
    jobTitle: string;
    stage: string;
    tone: 'friendly' | 'formal' | 'urgent';
    aiFitScore: number | null;
  }): Promise<{ subject: string; body: string }> {
    const content = await this.chatJson([
      {
        role: 'system',
        content:
          'You are a recruiter\'s writing assistant. Respond with ONLY a single valid JSON object of the form {"subject": "...", "body": "..."}, no markdown fences, no commentary. Keep the body under 120 words, no placeholders like [Your Name].',
      },
      {
        role: 'user',
        content: [
          `Draft a ${input.tone} outreach email to a job candidate.`,
          `Candidate: ${input.candidateName}`,
          `Role: ${input.jobTitle}`,
          `Current pipeline stage: ${input.stage}`,
          input.aiFitScore != null ? `AI fit score: ${input.aiFitScore}/100` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ]);

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      this.logger.error(`Groq returned non-JSON content: ${content.slice(0, 200)}`);
      throw new BadGatewayException('AI generation returned an unusable response');
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).subject !== 'string' ||
      typeof (parsed as Record<string, unknown>).body !== 'string'
    ) {
      this.logger.error(`Groq JSON missing expected shape: ${content.slice(0, 200)}`);
      throw new BadGatewayException('AI generation returned an unusable response');
    }

    const result = parsed as { subject: string; body: string };
    return { subject: result.subject, body: result.body };
  }

  private async chatJson(
    messages: { role: 'system' | 'user'; content: string }[],
  ): Promise<string> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<GroqChatResponse>(
          GROQ_CHAT_URL,
          {
            model: CHAT_MODEL,
            messages,
            temperature: 0.6,
            response_format: { type: 'json_object' },
          },
          {
            headers: { Authorization: `Bearer ${this.apiKey}` },
            timeout: 20000,
          },
        ),
      );
      return data.choices?.[0]?.message?.content ?? '';
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error(
        `Groq chat completion failed: ${axiosErr.message} (status ${axiosErr.response?.status ?? 'n/a'})`,
      );
      throw new BadGatewayException('AI generation service unavailable');
    }
  }

  private buildJobDescriptionPrompt(dto: GenerateJobDescriptionDto): string {
    const context = [
      `Job title: ${dto.title}`,
      dto.department ? `Department: ${dto.department}` : null,
      dto.location ? `Location: ${dto.location}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    return [
      context,
      '',
      'Generate a job posting for this role. Return a JSON object with exactly these keys:',
      '- "description": a 2-4 sentence overview paragraph (plain text, no markdown)',
      '- "requirements": a newline-separated bullet list as a single string, each line starting with "- "',
      '- "mustHaveSkills": an array of 3-8 short skill strings',
    ].join('\n');
  }

  private parseJobDescriptionResponse(content: string): GeneratedJobDescriptionDto {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      this.logger.error(`Groq returned non-JSON content: ${content.slice(0, 200)}`);
      throw new BadGatewayException('AI generation returned an unusable response');
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).description !== 'string' ||
      typeof (parsed as Record<string, unknown>).requirements !== 'string' ||
      !Array.isArray((parsed as Record<string, unknown>).mustHaveSkills)
    ) {
      this.logger.error(`Groq JSON missing expected shape: ${content.slice(0, 200)}`);
      throw new BadGatewayException('AI generation returned an unusable response');
    }

    const result = parsed as {
      description: string;
      requirements: string;
      mustHaveSkills: unknown[];
    };

    return {
      description: result.description,
      requirements: result.requirements,
      mustHaveSkills: result.mustHaveSkills.filter((s): s is string => typeof s === 'string'),
    };
  }

  private parseSuggestionsResponse(content: string): string[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      this.logger.error(`Groq returned non-JSON content: ${content.slice(0, 200)}`);
      throw new BadGatewayException('AI generation returned an unusable response');
    }

    const suggestions = (parsed as Record<string, unknown> | null)?.suggestions;
    if (!Array.isArray(suggestions)) {
      this.logger.error(`Groq JSON missing "suggestions" array: ${content.slice(0, 200)}`);
      throw new BadGatewayException('AI generation returned an unusable response');
    }

    return suggestions.filter((s): s is string => typeof s === 'string');
  }
}
