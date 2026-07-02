import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
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
import { ApplicationBoardDto } from './dto/application-board.dto';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { ApplicationFacetsDto } from './dto/application-facets.dto';
import { ApplicationListItemDto, ApplicationListResponseDto } from './dto/application-list-item.dto';
import { UpdateApplicationStageDto } from './dto/update-application-stage.dto';
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

  @Get('facets')
  @ApiOperation({ summary: 'Filter facet counts for the candidates list' })
  @ApiResponse({ status: 200, type: ApplicationFacetsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getFacets(@CurrentUser() user: SafeUser): Promise<ApplicationFacetsDto> {
    return this.applicationsService.getFacets(user.companyId);
  }

  @Get('board')
  @ApiOperation({ summary: 'Get the pipeline board (applications grouped by stage) for one job' })
  @ApiResponse({ status: 200, type: ApplicationBoardDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  getBoard(
    @Query('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<ApplicationBoardDto> {
    return this.applicationsService.getBoard(jobId, user.companyId);
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a single candidate application detail' })
  @ApiResponse({ status: 200, type: ApplicationDetailDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.findOne(id, user.companyId);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Move an application to a different pipeline stage' })
  @ApiResponse({ status: 200, type: ApplicationListItemDto })
  @ApiResponse({ status: 400, description: 'Invalid stage' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationStageDto,
    @CurrentUser() user: SafeUser,
  ): Promise<ApplicationListItemDto> {
    return this.applicationsService.updateStage(id, user.companyId, dto.stage);
  }
}
