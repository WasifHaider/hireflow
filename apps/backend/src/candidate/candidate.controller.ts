import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CandidateAuthGuard } from '../auth/guards/candidate-auth.guard';
import type { AuthenticatedCandidate } from '../auth/types/auth-user.type';
import { CandidateService } from './candidate.service';

@ApiTags('Candidate')
@ApiBearerAuth()
@UseGuards(CandidateAuthGuard)
@Controller('candidate')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Get('me/applications')
  @ApiOperation({
    summary: 'List all of the authenticated candidate\'s applications',
  })
  @ApiResponse({
    status: 200,
    description: 'Applications across all companies, newest first',
  })
  @ApiResponse({ status: 401, description: 'Candidate access required' })
  findMyApplications(@CurrentUser() candidate: AuthenticatedCandidate) {
    return this.candidateService.findMyApplications(candidate.id);
  }
}
