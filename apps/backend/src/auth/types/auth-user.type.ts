import { SafeCandidate } from './safe-candidate.type';
import { SafeUser } from './safe-user.type';

// The shape attached to `req.user` by JwtStrategy.validate(), discriminated by
// userType so guards and controllers can narrow to the correct identity.
export type AuthenticatedRecruiter = SafeUser & { userType: 'recruiter' };
export type AuthenticatedCandidate = SafeCandidate & { userType: 'candidate' };

export type AuthUser = AuthenticatedRecruiter | AuthenticatedCandidate;
