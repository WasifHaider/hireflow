import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PublicCompanyResponseDto } from './dto/public-company-response.dto';
import { PublicJobResponseDto } from './dto/public-job-response.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { SubmitApplicationResponseDto } from './dto/submit-application-response.dto';
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
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit an anonymous job application' })
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
  ): Promise<SubmitApplicationResponseDto> {
    return this.publicService.submitApplication(dto);
  }
}
