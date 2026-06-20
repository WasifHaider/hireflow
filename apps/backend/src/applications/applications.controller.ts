import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecruiterAuthGuard } from '../auth/guards/recruiter-auth.guard';
import type { SafeUser } from '../auth/types/safe-user.type';
import { ApplicationsService } from './applications.service';
import { ApplicationListResponseDto } from './dto/application-list-item.dto';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto';
import { ResumeUrlResponseDto } from './dto/resume-url-response.dto';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(RecruiterAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'List applications for the current company (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated applications', type: ApplicationListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @Query() query: ListApplicationsQueryDto,
    @CurrentUser() user: SafeUser,
  ): Promise<ApplicationListResponseDto> {
    return this.applicationsService.findAll(query, user.companyId);
  }

  @Get(':id/resume-url')
  @ApiOperation({ summary: 'Get a signed URL to view an application resume' })
  @ApiResponse({
    status: 200,
    description: 'Signed resume URL (expires in 5 minutes)',
    type: ResumeUrlResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Application not found or no resume on file' })
  getResumeUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<ResumeUrlResponseDto> {
    return this.applicationsService.getResumeUrl(id, user.companyId);
  }
}
