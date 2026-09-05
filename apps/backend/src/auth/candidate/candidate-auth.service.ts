import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Candidate } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeCandidate } from '../types/safe-candidate.type';
import { CandidateJwtPayload } from '../types/jwt-payload.type';
import { CandidateSigninDto } from './dto/candidate-signin.dto';
import { CandidateSignupDto } from './dto/candidate-signup.dto';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class CandidateAuthService {
  private readonly logger = new Logger(CandidateAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Email verification removed by product decision: signup activates the
   * account immediately and returns a session, same shape as signin. No
   * verification email is sent.
   */
  async signup(dto: CandidateSignupDto): Promise<{
    user: SafeCandidate;
    accessToken: string;
  }> {
    const existing = await this.prisma.candidate.findUnique({
      where: { email: dto.email },
    });

    // Only a fully-provisioned account (has a password) blocks re-signup. An
    // anonymous applicant row (no password, created by an earlier anonymous
    // application) may still be claimed by the upsert below.
    if (existing && existing.passwordHash !== null) {
      throw new ConflictException('Account already exists');
    }

    // bcrypt is CPU-bound — keep it outside any DB transaction.
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const now = new Date();

    // Upsert by email. Setting emailVerifiedAt here (immediately, no
    // verification step) is what "reconciles" the account with any anonymous
    // applications that already point at this same row (they were upserted
    // by email at apply-time) — see ApplicationSubmissionService.
    const candidate = await this.prisma.candidate.upsert({
      where: { email: dto.email },
      create: {
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        linkedinUrl: dto.linkedinUrl,
        passwordHash,
        emailVerifiedAt: now,
        lastLoginAt: now,
      },
      update: {
        fullName: dto.fullName,
        phone: dto.phone,
        linkedinUrl: dto.linkedinUrl,
        passwordHash,
        emailVerifiedAt: now,
        lastLoginAt: now,
      },
    });

    this.logger.log(`Candidate signed up: ${dto.email}`);
    return {
      user: this.toSafeCandidate(candidate),
      accessToken: this.generateToken(candidate),
    };
  }

  async signin(dto: CandidateSigninDto): Promise<{
    user: SafeCandidate;
    accessToken: string;
  }> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { email: dto.email },
    });

    // No account, or an anonymous applicant row that never set a password.
    const passwordValid =
      candidate?.passwordHash &&
      (await bcrypt.compare(dto.password, candidate.passwordHash));

    if (!candidate || !passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const updated = await this.prisma.candidate.update({
      where: { id: candidate.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.toSafeCandidate(updated),
      accessToken: this.generateToken(updated),
    };
  }

  private generateToken(candidate: Candidate): string {
    const payload: CandidateJwtPayload = {
      sub: candidate.id,
      userType: 'candidate',
      email: candidate.email,
    };
    return this.jwtService.sign(payload);
  }

  private toSafeCandidate(candidate: Candidate): SafeCandidate {
    const {
      passwordHash: _passwordHash,
      emailVerificationToken: _token,
      emailVerificationTokenExpiresAt: _tokenExpiry,
      ...safe
    } = candidate;
    return safe;
  }
}
