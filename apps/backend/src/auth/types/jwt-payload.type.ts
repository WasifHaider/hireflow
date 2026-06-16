export type UserType = 'recruiter' | 'candidate';

export interface BaseJwtPayload {
  sub: string;
  email: string;
  userType: UserType;
}

export interface RecruiterJwtPayload extends BaseJwtPayload {
  userType: 'recruiter';
  companyId: string;
  role: 'ADMIN' | 'RECRUITER';
}

export interface CandidateJwtPayload extends BaseJwtPayload {
  userType: 'candidate';
}

export type JwtPayload = RecruiterJwtPayload | CandidateJwtPayload;
