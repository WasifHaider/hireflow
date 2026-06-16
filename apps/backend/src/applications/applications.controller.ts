import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
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
import { ResumeUrlResponseDto } from './dto/resume-url-response.dto';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(RecruiterAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

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
