import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CandidateAuthController } from './candidate/candidate-auth.controller';
import { CandidateAuthService } from './candidate/candidate-auth.service';
import { CandidateAuthGuard } from './guards/candidate-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RecruiterAuthGuard } from './guards/recruiter-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_EXPIRES_IN',
            '7d',
          ) as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController, CandidateAuthController],
  providers: [
    AuthService,
    CandidateAuthService,
    JwtStrategy,
    JwtAuthGuard,
    RecruiterAuthGuard,
    CandidateAuthGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RecruiterAuthGuard,
    CandidateAuthGuard,
  ],
})
export class AuthModule {}
