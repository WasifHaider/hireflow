import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Candidate } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeCandidate } from '../types/safe-candidate.type';
import { CandidateJwtPayload } from '../types/jwt-payload.type';
import { CandidateSigninDto } from './dto/candidate-signin.dto';
import { CandidateSignupDto } from './dto/candidate-signup.dto';

const BCRYPT_SALT_ROUNDS = 10;
const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

@Injectable()
export class CandidateAuthService {
  private readonly logger = new Logger(CandidateAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: CandidateSignupDto): Promise<{
    message: string;
    email: string;
  }> {
    const existing = await this.prisma.candidate.findUnique({
      where: { email: dto.email },
    });

    // Only a fully-provisioned account (has a password AND is verified) blocks
    // re-signup. An anonymous applicant row (no password) or an unverified
    // signup may be (re)claimed by upsert below.
    if (
      existing &&
      existing.passwordHash !== null &&
      existing.emailVerifiedAt !== null
    ) {
      throw new ConflictException('Account already exists');
    }

    // bcrypt is CPU-bound — keep it outside any DB transaction.
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    // Opaque, cryptographically-random token (NOT a JWT): single-use,
    // server-revocable, and carries no decodable payload.
    const token = randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);

    // Upsert by email. Crucially we DO NOT touch emailVerifiedAt here — linking
    // an anonymous application to this account only happens after the email is
    // verified (defense-2).
    await this.prisma.candidate.upsert({
      where: { email: dto.email },
      create: {
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        linkedinUrl: dto.linkedinUrl,
        passwordHash,
        emailVerificationToken: token,
        emailVerificationTokenExpiresAt: tokenExpiresAt,
      },
      update: {
        fullName: dto.fullName,
        phone: dto.phone,
        linkedinUrl: dto.linkedinUrl,
        passwordHash,
        emailVerificationToken: token,
        emailVerificationTokenExpiresAt: tokenExpiresAt,
      },
    });

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173');
    const verificationLink = `${appUrl}/verify-candidate?token=${token}`;
    await this.mailService.sendVerificationEmail(
      dto.email,
      dto.fullName,
      verificationLink,
    );

    this.logger.log(`Candidate signup pending verification: ${dto.email}`);
    return {
      message: 'Account created. Check your email to verify.',
      email: dto.email,
    };
  }

  async verifyEmail(token: string): Promise<{
    user: SafeCandidate;
    accessToken: string;
  }> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { emailVerificationToken: token },
    });

    // Identical message for "not found" and "expired" so we never leak which
    // case the caller hit.
    if (
      !candidate ||
      !candidate.emailVerificationTokenExpiresAt ||
      candidate.emailVerificationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const now = new Date();
    // RECONCILIATION HAPPENS HERE — but it is *implicit*. submitApplication
    // upserts the candidate row by email, so any anonymous applications already
    // point at THIS row. Setting emailVerifiedAt is all that's needed to "claim"
    // them; there is no separate linking step.
    const verified = await this.prisma.$transaction((tx) =>
      tx.candidate.update({
        where: { id: candidate.id },
        data: {
          emailVerifiedAt: now,
          emailVerificationToken: null,
          emailVerificationTokenExpiresAt: null,
          lastLoginAt: now,
        },
      }),
    );

    this.logger.log(`Candidate verified: ${verified.email}`);
    return {
      user: this.toSafeCandidate(verified),
      accessToken: this.generateToken(verified),
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

    if (candidate.emailVerifiedAt === null) {
      throw new ForbiddenException(
        'Please verify your email before signing in',
      );
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
