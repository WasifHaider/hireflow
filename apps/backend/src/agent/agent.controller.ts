import { Body, Controller, Logger, Post, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecruiterAuthGuard } from '../auth/guards/recruiter-auth.guard';
import type { SafeUser } from '../auth/types/safe-user.type';
import { AgentService } from './agent.service';
import { AgentQueryDto } from './dto/agent-query.dto';
import { AgentEvent } from './types/agent.types';

@ApiTags('Agent')
@ApiBearerAuth()
@UseGuards(RecruiterAuthGuard)
@Controller('agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(private readonly agentService: AgentService) {}

  @Post('query')
  @Sse()
  // External LLM call driving multiple tool round-trips per request — keep
  // tighter than the global default, same rationale as /ai/generate-*.
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Run one turn of the recruiter copilot agent loop and stream tool-call/result events via SSE',
  })
  query(
    @Body() dto: AgentQueryDto,
    @CurrentUser() user: SafeUser,
  ): Observable<{ data: AgentEvent }> {
    // companyId is read off the authenticated JWT user, never off `dto` —
    // AgentQueryDto has no companyId field at all, so there is nothing here
    // for the model or the client to override.
    const companyId = user.companyId;

    return new Observable<{ data: AgentEvent }>((subscriber) => {
      let closed = false;
      const emit = (event: AgentEvent) => {
        if (closed) return;
        subscriber.next({ data: event });
        if (event.type === 'done' || event.type === 'error' || event.type === 'confirmation_required') {
          closed = true;
          subscriber.complete();
        }
      };

      this.agentService.run(dto, companyId, user.id, emit).catch((err) => {
        this.logger.error(`Agent loop crashed: ${(err as Error).message}`);
        if (!closed) {
          subscriber.next({ data: { type: 'error', message: 'The copilot hit an unexpected error.' } });
          subscriber.complete();
        }
      });

      return () => {
        closed = true;
      };
    });
  }
}
