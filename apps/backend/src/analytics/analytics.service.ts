import { Injectable } from '@nestjs/common';
import { ApplicationStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsSummaryResponseDto } from './dto/analytics-summary-response.dto';

const FUNNEL_STAGES: ApplicationStage[] = ['APPLIED', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];
const HISTOGRAM_BUCKET_WIDTH = 10;
const HISTOGRAM_BUCKET_COUNT = 10; // 0-9, 10-19, ..., 90-100 (last bucket is inclusive of 100)
const TOP_JOBS_LIMIT = 5;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(companyId: string): Promise<AnalyticsSummaryResponseDto> {
    const [totalApplications, hired, stageGroups, scoredApplications, jobs] = await Promise.all([
      this.prisma.application.count({ where: { companyId } }),
      this.prisma.application.count({ where: { companyId, currentStage: 'HIRED' } }),
      this.prisma.application.groupBy({ by: ['currentStage'], where: { companyId }, _count: true }),
      this.prisma.application.findMany({
        where: { companyId, aiFitScore: { not: null } },
        select: { aiFitScore: true },
      }),
      this.prisma.job.findMany({
        where: { companyId, deletedAt: null },
        select: {
          id: true,
          title: true,
          department: true,
          _count: { select: { applications: true } },
          applications: {
            select: { aiFitScore: true, currentStage: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const funnel = FUNNEL_STAGES.map((stage) => ({ stage, count: 0 }));
    const funnelIndex = new Map(funnel.map((f, i) => [f.stage, i]));
    for (const g of stageGroups) {
      const rowCount = typeof g._count === 'number' ? g._count : 0;
      const idx = funnelIndex.get(g.currentStage);
      if (idx !== undefined) funnel[idx].count = rowCount;
    }

    const scoreHistogram = this.buildHistogram(
      scoredApplications.map((a) => a.aiFitScore).filter((s): s is number => s !== null),
    );

    const topJobs = jobs
      .map((job) => {
        const scores = job.applications
          .map((a) => a.aiFitScore)
          .filter((s): s is number => s !== null);
        const avgScore = scores.length
          ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
          : 0;
        const hires = job.applications.filter((a) => a.currentStage === 'HIRED').length;
        return {
          id: job.id,
          title: job.title,
          department: job.department,
          applicationCount: job._count.applications,
          avgScore,
          hires,
        };
      })
      .sort((a, b) => b.applicationCount - a.applicationCount)
      .slice(0, TOP_JOBS_LIMIT);

    return { totalApplications, hired, funnel, scoreHistogram, topJobs };
  }

  private buildHistogram(scores: number[]): { range: string; count: number }[] {
    const bins = Array.from({ length: HISTOGRAM_BUCKET_COUNT }, (_, i) => {
      const lo = i * HISTOGRAM_BUCKET_WIDTH;
      const hi = i === HISTOGRAM_BUCKET_COUNT - 1 ? 100 : lo + HISTOGRAM_BUCKET_WIDTH - 1;
      return { range: `${lo}-${hi}`, count: 0 };
    });
    for (const score of scores) {
      const clamped = Math.min(100, Math.max(0, score));
      const idx = Math.min(HISTOGRAM_BUCKET_COUNT - 1, Math.floor(clamped / HISTOGRAM_BUCKET_WIDTH));
      bins[idx].count += 1;
    }
    return bins;
  }
}
