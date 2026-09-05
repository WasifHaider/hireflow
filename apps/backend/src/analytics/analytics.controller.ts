import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecruiterAuthGuard } from '../auth/guards/recruiter-auth.guard';
import type { SafeUser } from '../auth/types/safe-user.type';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSummaryResponseDto } from './dto/analytics-summary-response.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(RecruiterAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Company-wide hiring analytics: funnel, AI score distribution, top jobs' })
  @ApiResponse({ status: 200, description: 'Analytics summary', type: AnalyticsSummaryResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSummary(@CurrentUser() user: SafeUser): Promise<AnalyticsSummaryResponseDto> {
    return this.analyticsService.getSummary(user.companyId);
  }
}
