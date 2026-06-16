import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const candidateApplicationSelect = {
  id: true,
  currentStage: true,
  aiFitScore: true,
  appliedAt: true,
  resumeFilename: true,
  job: {
    select: {
      id: true,
      title: true,
      location: true,
      jobType: true,
      employmentType: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      publishedAt: true,
      deletedAt: true,
      company: {
        select: {
          name: true,
          slug: true,
          logoUrl: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class CandidateService {
  constructor(private readonly prisma: PrismaService) {}

  async findMyApplications(candidateId: string) {
    const applications = await this.prisma.application.findMany({
      where: { candidateId },
      orderBy: { appliedAt: 'desc' },
      select: candidateApplicationSelect,
    });

    // Applications to soft-deleted jobs are kept (the candidate still applied),
    // but surfaced with jobAvailable:false instead of leaking the raw
    // deletedAt timestamp. The frontend renders "no longer available".
    return applications.map(({ job, ...application }) => {
      const { deletedAt, ...jobFields } = job;
      return {
        ...application,
        job: {
          ...jobFields,
          jobAvailable: deletedAt === null,
        },
      };
    });
  }
}
