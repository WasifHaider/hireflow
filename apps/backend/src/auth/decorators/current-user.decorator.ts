import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../types/auth-user.type';

// Returns req.user (set by JwtStrategy). The active guard guarantees the
// concrete type, so controllers annotate the param with the type they expect
// (e.g. SafeUser behind RecruiterAuthGuard, AuthenticatedCandidate behind
// CandidateAuthGuard).
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
