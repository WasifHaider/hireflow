import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CandidateAuthService } from './candidate-auth.service';
import { CandidateSigninDto } from './dto/candidate-signin.dto';
import { CandidateSignupDto } from './dto/candidate-signup.dto';

@ApiTags('Candidate Auth')
@Controller('auth/candidate')
export class CandidateAuthController {
  constructor(private readonly candidateAuthService: CandidateAuthService) {}

  @Post('signup')
  // Auth endpoints are prime brute-force / enumeration targets — tighten the
  // global throttler to 5 requests/minute on this route.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Register a candidate account (verification email sent, no JWT)',
  })
  @ApiResponse({
    status: 201,
    description: 'Account created; verification email sent',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Account already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  signup(@Body() dto: CandidateSignupDto) {
    return this.candidateAuthService.signup(dto);
  }

  @Get('verify')
  @ApiOperation({
    summary: 'Verify a candidate email and receive an access token',
  })
  @ApiResponse({ status: 200, description: 'Email verified; JWT issued' })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
  })
  verify(@Query('token') token: string) {
    return this.candidateAuthService.verifyEmail(token);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Sign in as a verified candidate' })
  @ApiResponse({ status: 200, description: 'Authenticated; JWT issued' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  signin(@Body() dto: CandidateSigninDto) {
    return this.candidateAuthService.signin(dto);
  }
}
