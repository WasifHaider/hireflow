import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ResumeFilePipe } from '../storage/pipes/resume-file.pipe';
import { PublicCompanyResponseDto } from './dto/public-company-response.dto';
import { PublicJobResponseDto } from './dto/public-job-response.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { SubmitApplicationResponseDto } from './dto/submit-application-response.dto';
import { ListPublicJobsQueryDto } from './dto/list-public-jobs-query.dto';
import { PublicJobListResponseDto } from './dto/public-job-list-response.dto';
import { CompanySlugPipe } from './pipes/company-slug.pipe';
import { PublicService } from './public.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('companies/:companySlug')
  @ApiOperation({ summary: 'Get public company branding by slug' })
  @ApiResponse({
    status: 200,
    description: 'Company public profile',
    type: PublicCompanyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid company slug format' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  getCompany(
    @Param('companySlug', CompanySlugPipe) companySlug: string,
  ): Promise<PublicCompanyResponseDto> {
    return this.publicService.getCompanyBySlug(companySlug);
  }

  @Get('jobs')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Browse published jobs across all companies (global board)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated published jobs',
    type: PublicJobListResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  listJobs(
    @Query() query: ListPublicJobsQueryDto,
  ): Promise<PublicJobListResponseDto> {
    return this.publicService.listPublicJobs(query);
  }

  @Get('jobs/:companySlug/:jobId')
  @ApiOperation({ summary: 'Get a published job for the public careers page' })
  @ApiResponse({
    status: 200,
    description: 'Published job details',
    type: PublicJobResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid company slug format' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  getJob(
    @Param('companySlug', CompanySlugPipe) companySlug: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<PublicJobResponseDto> {
    return this.publicService.getPublicJob(companySlug, jobId);
  }

  @Post('applications')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('resume', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit an anonymous job application with resume' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['resume', 'jobId', 'fullName', 'email'],
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
        fullName: { type: 'string', minLength: 2, maxLength: 100 },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string', maxLength: 30 },
        linkedinUrl: { type: 'string', format: 'uri' },
        coverLetter: { type: 'string', maxLength: 5000 },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Application submitted',
    type: SubmitApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Job not found or not accepting applications' })
  @ApiResponse({ status: 409, description: 'Already applied to this job' })
  @ApiResponse({
    status: 429,
    description: 'Too many requests (global or application submit limit)',
  })
  submitApplication(
    @Body() dto: SubmitApplicationDto,
    @UploadedFile(ResumeFilePipe) resume: Express.Multer.File,
  ): Promise<SubmitApplicationResponseDto> {
    return this.publicService.submitApplication(dto, resume);
  }
}
