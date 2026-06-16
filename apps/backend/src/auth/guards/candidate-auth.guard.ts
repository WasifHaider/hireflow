import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthUser } from '../types/auth-user.type';

// Authenticates the JWT AND requires the identity to be a candidate. Used on
// candidate-facing endpoints so a recruiter token can never reach them.
@Injectable()
export class CandidateAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthUser>(
    err: unknown,
    user: AuthUser | false,
    _info: unknown,
    _context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }
    if (user.userType !== 'candidate') {
      throw new UnauthorizedException('Candidate access required');
    }
    return user as TUser;
  }
}
