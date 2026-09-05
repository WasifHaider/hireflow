import { BadRequestException, Injectable } from '@nestjs/common';
import { ApplicationStage } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { ApplicationsService } from '../applications/applications.service';
import { AgentToolName } from './types/agent.types';

const STAGES = ['APPLIED', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'] as const;
const TONES = ['friendly', 'formal', 'urgent'] as const;

export interface ToolExecutionResult {
  summary: string;
  data: unknown;
}

/**
 * Thin wrappers around ApplicationsService/AiService — the actual tool
 * implementations the model's tool_calls resolve to. companyId is passed in
 * explicitly by AgentService (derived from the JWT, never from model args)
 * on every single call; that's the entire multi-tenancy guarantee for this
 * feature; no tool method here accepts a companyId from its args object.
 */
@Injectable()
export class AgentToolsService {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly aiService: AiService,
  ) {}

  async execute(
    name: AgentToolName,
    args: Record<string, unknown>,
    companyId: string,
  ): Promise<ToolExecutionResult> {
    switch (name) {
      case 'search_candidates':
        return this.searchCandidates(args, companyId);
      case 'get_pipeline':
        return this.getPipeline(args, companyId);
      case 'get_candidate':
        return this.getCandidate(args, companyId);
      case 'move_stage':
        return this.moveStage(args, companyId);
      case 'draft_outreach':
        return this.draftOutreach(args, companyId);
      default:
        throw new BadRequestException(`Unknown tool: ${String(name)}`);
    }
  }

  private async searchCandidates(
    args: Record<string, unknown>,
    companyId: string,
  ): Promise<ToolExecutionResult> {
    const stage = this.optionalEnum(args.stage, STAGES, 'stage');
    const result = await this.applicationsService.findAll(
      {
        page: 1,
        pageSize: 10,
        sortBy: 'appliedAt',
        sortOrder: 'desc',
        q: this.optionalString(args.q),
        jobId: this.optionalString(args.job_id),
        stage,
        scoreMin: this.optionalNumber(args.score_min),
        scoreMax: this.optionalNumber(args.score_max),
      },
      companyId,
    );

    const candidates = result.data.map((a) => ({
      id: a.id,
      name: a.candidate.fullName,
      email: a.candidate.email,
      job: a.job.title,
      stage: a.currentStage,
      aiFitScore: a.aiFitScore,
    }));

    return {
      summary: `found ${result.total} candidate${result.total === 1 ? '' : 's'}${
        candidates.length < result.total ? ` (showing ${candidates.length})` : ''
      }`,
      data: { total: result.total, candidates },
    };
  }

  private async getPipeline(
    args: Record<string, unknown>,
    companyId: string,
  ): Promise<ToolExecutionResult> {
    const jobId = this.requiredString(args.job_id, 'job_id');
    const board = await this.applicationsService.getBoard(jobId, companyId);

    const stagesSummary = Object.fromEntries(
      STAGES.map((s) => [
        s,
        {
          count: board.counts[s],
          candidates: board.stages[s]
            .slice(0, 5)
            .map((a) => ({ id: a.id, name: a.candidate.fullName, aiFitScore: a.aiFitScore })),
        },
      ]),
    );

    return {
      summary: `pipeline for "${board.job.title}": ${STAGES.map((s) => `${s} ${board.counts[s]}`).join(', ')}`,
      data: { job: board.job, stages: stagesSummary },
    };
  }

  private async getCandidate(
    args: Record<string, unknown>,
    companyId: string,
  ): Promise<ToolExecutionResult> {
    const id = this.requiredString(args.id, 'id');
    const application = await this.applicationsService.findOne(id, companyId);

    return {
      summary: `${application.candidate.fullName} — ${application.job.title}, stage ${application.currentStage}${
        application.aiFitScore != null ? `, fit ${application.aiFitScore}/100` : ''
      }`,
      data: {
        id: application.id,
        name: application.candidate.fullName,
        email: application.candidate.email,
        phone: application.candidate.phone,
        linkedinUrl: application.candidate.linkedinUrl,
        job: application.job.title,
        stage: application.currentStage,
        aiFitScore: application.aiFitScore,
        resumeExcerpt: application.resumeText?.slice(0, 800) ?? null,
      },
    };
  }

  private async moveStage(
    args: Record<string, unknown>,
    companyId: string,
  ): Promise<ToolExecutionResult> {
    const candidateId = this.requiredString(args.candidate_id, 'candidate_id');
    const stage = this.requiredEnum(args.stage, STAGES, 'stage') as ApplicationStage;

    const updated = await this.applicationsService.updateStage(candidateId, companyId, stage);

    return {
      summary: `moved ${updated.candidate.fullName} to ${updated.currentStage}`,
      data: {
        id: updated.id,
        name: updated.candidate.fullName,
        stage: updated.currentStage,
      },
    };
  }

  private async draftOutreach(
    args: Record<string, unknown>,
    companyId: string,
  ): Promise<ToolExecutionResult> {
    const candidateId = this.requiredString(args.candidate_id, 'candidate_id');
    const tone = this.requiredEnum(args.tone, TONES, 'tone');

    const application = await this.applicationsService.findOne(candidateId, companyId);
    const draft = await this.aiService.generateOutreachMessage({
      candidateName: application.candidate.fullName,
      jobTitle: application.job.title,
      stage: application.currentStage,
      tone: tone as 'friendly' | 'formal' | 'urgent',
      aiFitScore: application.aiFitScore,
    });

    return {
      summary: `drafted a ${tone} outreach email to ${application.candidate.fullName}: "${draft.subject}"`,
      data: { candidateId: application.id, candidateName: application.candidate.fullName, ...draft },
    };
  }

  // ── arg parsing helpers ───────────────────────────────────────────────────
  private requiredString(value: unknown, field: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`Missing required argument: ${field}`);
    }
    return value;
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  private optionalNumber(value: unknown): number | undefined {
    if (value == null || value === '') return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  }

  private requiredEnum<T extends readonly string[]>(
    value: unknown,
    allowed: T,
    field: string,
  ): T[number] {
    if (typeof value !== 'string' || !allowed.includes(value)) {
      throw new BadRequestException(
        `Invalid ${field}: must be one of ${allowed.join(', ')}`,
      );
    }
    return value;
  }

  private optionalEnum<T extends readonly string[]>(
    value: unknown,
    allowed: T,
    field: string,
  ): T[number] | undefined {
    if (value == null) return undefined;
    return this.requiredEnum(value, allowed, field);
  }
}
