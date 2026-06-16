import { Candidate } from '@prisma/client';

// Strip the password hash and verification-token internals from any candidate
// object that leaves the service layer or is attached to the request.
export type SafeCandidate = Omit<
  Candidate,
  'passwordHash' | 'emailVerificationToken' | 'emailVerificationTokenExpiresAt'
>;
