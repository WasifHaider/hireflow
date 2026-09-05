import { BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ApplicationsService } from '../applications/applications.service';
import { AgentToolsService } from './agent-tools.service';

/**
 * The entire multi-tenancy safety story for the agent copilot is: companyId
 * is threaded into AgentToolsService.execute() by the caller (AgentService,
 * itself fed from the JWT-derived CurrentUser) and NEVER read out of the
 * model-supplied `args`. These tests prove that even when a hostile/confused
 * model supplies its own `companyId`/`company_id` inside tool args, the value
 * actually used to query Prisma is the one AgentService passed in — because
 * AgentToolsService's private helpers only ever pull whitelisted fields
 * (q, job_id, stage, id, candidate_id, tone...) off `args`, and companyId
 * arrives as a completely separate function parameter that args cannot reach.
 */
describe('AgentToolsService — tenant isolation at the tool boundary', () => {
  let applicationsService: {
    findAll: jest.Mock;
    getBoard: jest.Mock;
    findOne: jest.Mock;
    updateStage: jest.Mock;
  };
  let aiService: { generateOutreachMessage: jest.Mock };
  let service: AgentToolsService;

  const REAL_COMPANY_ID = 'company-real-123';
  const ATTACKER_COMPANY_ID = 'company-attacker-999';

  beforeEach(() => {
    applicationsService = {
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      getBoard: jest.fn().mockResolvedValue({
        job: { id: 'job-1', title: 'Backend Engineer' },
        stages: { APPLIED: [], SCREENED: [], INTERVIEW: [], OFFER: [], HIRED: [], REJECTED: [] },
        counts: { APPLIED: 0, SCREENED: 0, INTERVIEW: 0, OFFER: 0, HIRED: 0, REJECTED: 0 },
      }),
      findOne: jest.fn().mockResolvedValue({
        id: 'app-1',
        currentStage: 'APPLIED',
        aiFitScore: 80,
        resumeText: 'resume text',
        candidate: { id: 'cand-1', fullName: 'Jane Doe', email: 'jane@x.com', phone: null, linkedinUrl: null },
        job: { id: 'job-1', title: 'Backend Engineer' },
      }),
      updateStage: jest.fn().mockResolvedValue({
        id: 'app-1',
        currentStage: 'INTERVIEW',
        candidate: { id: 'cand-1', fullName: 'Jane Doe', email: 'jane@x.com' },
      }),
    };
    aiService = {
      generateOutreachMessage: jest.fn().mockResolvedValue({ subject: 'Hi', body: 'Body' }),
    };
    service = new AgentToolsService(
      applicationsService as unknown as ApplicationsService,
      aiService as unknown as AiService,
    );
  });

  it('search_candidates: uses the injected companyId, ignoring any companyId in args', async () => {
    await service.execute(
      'search_candidates',
      { q: 'jane', companyId: ATTACKER_COMPANY_ID, company_id: ATTACKER_COMPANY_ID },
      REAL_COMPANY_ID,
    );

    expect(applicationsService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'jane' }),
      REAL_COMPANY_ID,
    );
    // Confirm no attacker-supplied company id leaked into the query args.
    const [queryArg] = applicationsService.findAll.mock.calls[0];
    expect(queryArg.companyId).toBeUndefined();
    expect(queryArg.company_id).toBeUndefined();
  });

  it('get_pipeline: uses the injected companyId, ignoring any companyId in args', async () => {
    await service.execute(
      'get_pipeline',
      { job_id: 'job-1', companyId: ATTACKER_COMPANY_ID },
      REAL_COMPANY_ID,
    );

    expect(applicationsService.getBoard).toHaveBeenCalledWith('job-1', REAL_COMPANY_ID);
  });

  it('get_candidate: uses the injected companyId, ignoring any companyId in args', async () => {
    await service.execute(
      'get_candidate',
      { id: 'app-1', companyId: ATTACKER_COMPANY_ID },
      REAL_COMPANY_ID,
    );

    expect(applicationsService.findOne).toHaveBeenCalledWith('app-1', REAL_COMPANY_ID);
  });

  it('move_stage: uses the injected companyId, ignoring any companyId in args', async () => {
    await service.execute(
      'move_stage',
      { candidate_id: 'app-1', stage: 'INTERVIEW', companyId: ATTACKER_COMPANY_ID },
      REAL_COMPANY_ID,
    );

    expect(applicationsService.updateStage).toHaveBeenCalledWith('app-1', REAL_COMPANY_ID, 'INTERVIEW');
  });

  it('draft_outreach: uses the injected companyId, ignoring any companyId in args', async () => {
    await service.execute(
      'draft_outreach',
      { candidate_id: 'app-1', tone: 'friendly', companyId: ATTACKER_COMPANY_ID },
      REAL_COMPANY_ID,
    );

    expect(applicationsService.findOne).toHaveBeenCalledWith('app-1', REAL_COMPANY_ID);
  });

  it('rejects an unknown tool name', async () => {
    await expect(
      service.execute('not_a_real_tool' as never, {}, REAL_COMPANY_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects move_stage with an invalid stage value', async () => {
    await expect(
      service.execute('move_stage', { candidate_id: 'app-1', stage: 'NOT_A_STAGE' }, REAL_COMPANY_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects get_candidate with a missing id', async () => {
    await expect(service.execute('get_candidate', {}, REAL_COMPANY_ID)).rejects.toThrow(
      BadRequestException,
    );
  });
});
