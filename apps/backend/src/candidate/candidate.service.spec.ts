import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApplicationSubmissionService } from '../applications/application-submission.service';
import { PrismaService } from '../prisma/prisma.service';
import { CandidateService } from './candidate.service';
import { ApplyToJobDto } from './dto/apply-to-job.dto';

describe('CandidateService', () => {
  let service: CandidateService;
  let prisma: {
    candidate: { findUnique: jest.Mock; update: jest.Mock };
    job: { findFirst: jest.Mock };
    application: { findMany: jest.Mock };
  };
  let submission: { create: jest.Mock };

  beforeEach(async () => {
    prisma = {
      candidate: { findUnique: jest.fn(), update: jest.fn() },
      job: { findFirst: jest.fn() },
      application: { findMany: jest.fn() },
    };
    submission = { create: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CandidateService,
        { provide: PrismaService, useValue: prisma },
        { provide: ApplicationSubmissionService, useValue: submission },
      ],
    }).compile();
    service = moduleRef.get(CandidateService);
  });

  describe('getProfile', () => {
    it('flattens _count and derives emailVerified', async () => {
      prisma.candidate.findUnique.mockResolvedValue({
        id: 'c1',
        fullName: 'Marcus',
        email: 'm@hey.com',
        phone: null,
        linkedinUrl: null,
        emailVerifiedAt: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
        _count: { applications: 3 },
      });

      const result = await service.getProfile('c1');

      expect(result).toMatchObject({
        id: 'c1',
        emailVerified: true,
        applicationCount: 3,
      });
      expect(result).not.toHaveProperty('_count');
      expect(result).not.toHaveProperty('emailVerifiedAt');
    });

    it('emailVerified is false when never verified', async () => {
      prisma.candidate.findUnique.mockResolvedValue({
        id: 'c1',
        fullName: 'M',
        email: 'm@hey.com',
        phone: null,
        linkedinUrl: null,
        emailVerifiedAt: null,
        createdAt: new Date(),
        _count: { applications: 0 },
      });

      const result = await service.getProfile('c1');
      expect(result.emailVerified).toBe(false);
    });

    it('throws 404 when candidate missing', async () => {
      prisma.candidate.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('applyToJob', () => {
    const dto = Object.assign(new ApplyToJobDto(), { jobId: 'j1' });
    const resume = { originalname: 'cv.pdf' } as Express.Multer.File;

    it('throws 404 for a job that is not published/available', async () => {
      prisma.job.findFirst.mockResolvedValue(null);
      await expect(
        service.applyToJob('c1', dto, resume),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(submission.create).not.toHaveBeenCalled();
    });

    it('delegates to the shared submission service with the candidate id', async () => {
      prisma.job.findFirst.mockResolvedValue({ id: 'j1', companyId: 'co1' });
      submission.create.mockResolvedValue({ applicationId: 'app1' });

      const result = await service.applyToJob('c1', dto, resume);

      expect(submission.create).toHaveBeenCalledWith({
        job: { id: 'j1', companyId: 'co1' },
        candidateId: 'c1',
        coverLetter: undefined,
        resume,
      });
      expect(result).toMatchObject({ applicationId: 'app1', status: 'submitted' });
    });
  });

  describe('updateProfile', () => {
    it('writes only provided fields then returns the refreshed profile', async () => {
      prisma.candidate.update.mockResolvedValue({});
      prisma.candidate.findUnique.mockResolvedValue({
        id: 'c1',
        fullName: 'New Name',
        email: 'm@hey.com',
        phone: null,
        linkedinUrl: null,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        _count: { applications: 1 },
      });

      const result = await service.updateProfile('c1', { fullName: 'New Name' });

      expect(prisma.candidate.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { fullName: 'New Name', phone: undefined, linkedinUrl: undefined },
      });
      expect(result.fullName).toBe('New Name');
    });
  });
});
