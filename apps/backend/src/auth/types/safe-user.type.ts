import { Company, User } from '@prisma/client';

export type SafeUser = Omit<User, 'passwordHash'>;

export type SafeUserWithCompany = SafeUser & { company: Company };
