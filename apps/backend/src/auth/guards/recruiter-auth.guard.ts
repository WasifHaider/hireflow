import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthUser } from '../types/auth-user.type';

// Authenticates the JWT (via the shared 'jwt' strategy) AND requires the
// identity to be a recruiter. Used on every company-facing endpoint so a
// candidate token can never reach recruiter data.
@Injectable()
export class RecruiterAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthUser>(
    err: unknown,
    user: AuthUser | false,
    _info: unknown,
    _context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }
    if (user.userType !== 'recruiter') {
      throw new UnauthorizedException('Recruiter access required');
    }
    return user as TUser;
  }
}
