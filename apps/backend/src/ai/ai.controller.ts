import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RecruiterAuthGuard } from '../auth/guards/recruiter-auth.guard';
import { AiService } from './ai.service';
import { GenerateJobDescriptionDto } from './dto/generate-job-description.dto';
import { GeneratedJobDescriptionDto } from './dto/generated-job-description.dto';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-job-description')
  @UseGuards(RecruiterAuthGuard)
  @ApiBearerAuth()
  // External LLM call — keep this tighter than the global 100/min default.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate a job description/requirements/skills draft from a title' })
  @ApiResponse({ status: 200, description: 'Generated draft', type: GeneratedJobDescriptionDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 502, description: 'AI generation service unavailable' })
  generateJobDescription(
    @Body() dto: GenerateJobDescriptionDto,
  ): Promise<GeneratedJobDescriptionDto> {
    return this.aiService.generateJobDescription(dto);
  }
}
