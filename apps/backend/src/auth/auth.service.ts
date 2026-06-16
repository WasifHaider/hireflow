import { randomBytes } from 'crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Company, Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SigninDto } from './dto/signin.dto';
import { SignupCompanyDto } from './dto/signup-company.dto';
import { JwtPayload } from './types/jwt-payload.type';
import { SafeUser } from './types/safe-user.type';

const BCRYPT_SALT_ROUNDS = 10;
const SLUG_MAX_LENGTH = 50;
const SLUG_COLLISION_RETRIES = 3;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signupCompany(dto: SignupCompanyDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const baseSlug = dto.slug ?? slugify(dto.companyName);
    let slug = await this.resolveUniqueSlug(baseSlug);

    for (let attempt = 0; attempt < SLUG_COLLISION_RETRIES; attempt++) {
      try {
        const { user, company } = await this.createCompanyAndUser(
          dto,
          slug,
          passwordHash,
        );
        const accessToken = this.generateToken(user);

        return {
          user: this.stripPasswordHash(user),
          company,
          accessToken,
        };
      } catch (error) {
        if (this.isUniqueConstraintOn(error, 'slug') && attempt < SLUG_COLLISION_RETRIES - 1) {
          slug = await this.resolveUniqueSlug(baseSlug);
          continue;
        }
        if (this.isUniqueConstraintOn(error, 'email')) {
          throw new ConflictException('Email already registered');
        }
        throw error;
      }
    }

    throw new ConflictException('Could not create company; please try again');
  }

  async signin(dto: SigninDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { company: true },
    });

    const passwordValid =
      user && (await bcrypt.compare(dto.password, user.passwordHash));

    if (!user || !passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      include: { company: true },
    });

    const accessToken = this.generateToken(updatedUser);
    const { passwordHash: _passwordHash, company, ...safeUser } = updatedUser;

    return {
      user: safeUser,
      company,
      accessToken,
    };
  }

  private async createCompanyAndUser(
    dto: SignupCompanyDto,
    slug: string,
    passwordHash: string,
  ): Promise<{ user: User; company: Company }> {
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.companyName,
          slug,
          industry: dto.industry,
          size: dto.size,
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          role: 'ADMIN',
          lastLoginAt: new Date(),
        },
      });

      return { user, company };
    });
  }

  private async resolveUniqueSlug(baseSlug: string): Promise<string> {
    const normalized = truncateSlug(baseSlug);
    const taken = await this.prisma.company.findUnique({
      where: { slug: normalized },
    });
    if (!taken) {
      return normalized;
    }
    return this.appendRandomSlugSuffix(normalized);
  }

  private appendRandomSlugSuffix(baseSlug: string): string {
    const suffix = randomSlugSuffix(4);
    const maxBaseLength = SLUG_MAX_LENGTH - 1 - suffix.length;
    const trimmedBase = baseSlug.slice(0, maxBaseLength);
    return `${trimmedBase}-${suffix}`;
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      userType: 'recruiter',
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  private stripPasswordHash(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private isUniqueConstraintOn(
    error: unknown,
    field: string,
  ): error is Prisma.PrismaClientKnownRequestError {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }
    const target = error.meta?.target;
    if (Array.isArray(target)) {
      return target.includes(field);
    }
    if (typeof target === 'string') {
      return target.includes(field);
    }
    return false;
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function truncateSlug(slug: string): string {
  return slug.slice(0, SLUG_MAX_LENGTH).replace(/-+$/g, '');
}

function randomSlugSuffix(length: number): string {
  return randomBytes(length).toString('hex').slice(0, length);
}
