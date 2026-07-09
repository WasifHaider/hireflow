import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CandidateAuthGuard } from '../auth/guards/candidate-auth.guard';
import type { AuthenticatedCandidate } from '../auth/types/auth-user.type';
import { ResumeFilePipe } from '../storage/pipes/resume-file.pipe';
import { CandidateService } from './candidate.service';
import { ApplyToJobDto } from './dto/apply-to-job.dto';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';

@ApiTags('Candidate')
@ApiBearerAuth()
@UseGuards(CandidateAuthGuard)
@Controller('candidate')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Get('me')
  @ApiOperation({ summary: "Get the authenticated candidate's profile" })
  @ApiResponse({ status: 200, description: 'Candidate profile' })
  @ApiResponse({ status: 401, description: 'Candidate access required' })
  getProfile(@CurrentUser() candidate: AuthenticatedCandidate) {
    return this.candidateService.getProfile(candidate.id);
  }

  @Patch('me')
  @ApiOperation({ summary: "Update the authenticated candidate's profile" })
  @ApiResponse({ status: 200, description: 'Updated candidate profile' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Candidate access required' })
  updateProfile(
    @CurrentUser() candidate: AuthenticatedCandidate,
    @Body() dto: UpdateCandidateProfileDto,
  ) {
    return this.candidateService.updateProfile(candidate.id, dto);
  }

  @Post('applications')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('resume', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Apply to a published job as the authenticated candidate',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['resume', 'jobId'],
      properties: {
        resume: {
          type: 'string',
          format: 'binary',
          description: 'PDF resume (max 5MB)',
        },
        jobId: {
          type: 'string',
          format: 'uuid',
          description: 'ID of the published job being applied to',
        },
        coverLetter: { type: 'string', maxLength: 5000 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Application submitted' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({
    status: 404,
    description: 'Job not found or not accepting applications',
  })
  @ApiResponse({ status: 409, description: 'Already applied to this job' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  apply(
    @CurrentUser() candidate: AuthenticatedCandidate,
    @Body() dto: ApplyToJobDto,
    @UploadedFile(ResumeFilePipe) resume: Express.Multer.File,
  ) {
    return this.candidateService.applyToJob(candidate.id, dto, resume);
  }

  @Get('me/applications')
  @ApiOperation({
    summary: "List all of the authenticated candidate's applications",
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
