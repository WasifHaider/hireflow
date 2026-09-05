import { Injectable, Logger } from '@nestjs/common';
import { ApplicationStage, Prisma } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';

const STAGES: ApplicationStage[] = ['APPLIED', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];
const TIMESERIES_DAYS = 7;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async getSummary(companyId: string): Promise<DashboardSummaryResponseDto> {
    // UTC-based boundary, matching Postgres's date_trunc('day', applied_at):
    // `applied_at` is a `timestamp without time zone` column and Prisma always
    // writes DateTime values as their UTC instant, so date_trunc buckets by
    // UTC calendar day regardless of the DB session's timezone setting. Using
    // server-LOCAL midnight here (as before) desyncs the two: on a non-UTC
    // host the "since" boundary and the per-day keys below no longer line up
    // with what Postgres actually grouped by, and every column can read 0.
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (TIMESERIES_DAYS - 1));

    const [activeJobs, totalApplications, awaitingReview, avgAgg, stageGroups, perDayRows] =
      await Promise.all([
        this.prisma.job.count({ where: { companyId, status: 'PUBLISHED', deletedAt: null } }),
        this.prisma.application.count({ where: { companyId } }),
        this.prisma.application.count({ where: { companyId, currentStage: 'APPLIED' } }),
        this.prisma.application.aggregate({ where: { companyId, aiFitScore: { not: null } }, _avg: { aiFitScore: true } }),
        this.prisma.application.groupBy({ by: ['currentStage'], where: { companyId }, _count: true }),
        this.prisma.$queryRaw<{ date: string; count: number }[]>(Prisma.sql`
          SELECT to_char(date_trunc('day', applied_at), 'YYYY-MM-DD') AS date,
                 count(*)::int AS count
          FROM applications
          WHERE company_id = ${companyId}
            AND applied_at >= ${since}
          GROUP BY 1
          ORDER BY 1
        `),
      ]);

    const pipeline = STAGES.reduce(
      (acc, stage) => { acc[stage] = 0; return acc; },
      {} as Record<ApplicationStage, number>,
    );
    for (const g of stageGroups) {
      // When _count: true, Prisma returns the total row count as a number
      const rowCount = typeof g._count === 'number' ? g._count : 0;
      pipeline[g.currentStage] = rowCount;
    }

    const byDate = new Map(perDayRows.map((r) => [r.date, Number(r.count)]));
    const applicationsPerDay = Array.from({ length: TIMESERIES_DAYS }, (_, i) => {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const date = d.toISOString().slice(0, 10);
      return { date, count: byDate.get(date) ?? 0 };
    });

    return {
      stats: {
        activeJobs,
        totalApplications,
        avgAiScore: Math.round(avgAgg._avg.aiFitScore ?? 0),
        awaitingReview,
      },
      pipeline,
      applicationsPerDay,
    };
  }

  /**
   * Non-critical by design: a failed/slow Groq call should never break the
   * dashboard, so callers get an empty array on failure rather than a thrown
   * error propagating to the client.
   */
  async getSuggestions(companyId: string): Promise<string[]> {
    const { stats, pipeline } = await this.getSummary(companyId);
    try {
      return await this.aiService.generateDashboardSuggestions({
        ...stats,
        pipeline: { ...pipeline },
      });
    } catch (err) {
      this.logger.warn(
        `AI suggestions unavailable for company ${companyId}: ${(err as Error).message}`,
      );
      return [];
    }
  }
}
