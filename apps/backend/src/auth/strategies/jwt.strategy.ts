import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../types/auth-user.type';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (payload.userType === 'candidate') {
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: payload.sub },
      });

      // Reject if the candidate is gone or has not verified their email. The
      // token is only ever issued post-verification, so an unverified row here
      // means the account was reset/invalidated.
      if (!candidate || candidate.emailVerifiedAt === null) {
        throw new UnauthorizedException();
      }

      const {
        passwordHash: _passwordHash,
        emailVerificationToken: _token,
        emailVerificationTokenExpiresAt: _tokenExpiry,
        ...safeCandidate
      } = candidate;
      return { ...safeCandidate, userType: 'candidate' };
    }

    // Recruiter path — also covers legacy tokens issued before userType existed
    // (they simply lack the field, so the candidate branch above is skipped).
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return { ...safeUser, userType: 'recruiter' };
  }
}
