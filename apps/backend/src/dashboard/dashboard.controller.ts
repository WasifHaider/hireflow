import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecruiterAuthGuard } from '../auth/guards/recruiter-auth.guard';
import type { SafeUser } from '../auth/types/safe-user.type';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(RecruiterAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Aggregated recruiter dashboard summary (stats, pipeline, 7-day timeseries)' })
  @ApiResponse({ status: 200, description: 'Dashboard summary', type: DashboardSummaryResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSummary(@CurrentUser() user: SafeUser): Promise<DashboardSummaryResponseDto> {
    return this.dashboardService.getSummary(user.companyId);
  }
}
