import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
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
    summary: 'Register a candidate account (activated immediately, JWT issued)',
  })
  @ApiResponse({ status: 201, description: 'Account created; authenticated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Account already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  signup(@Body() dto: CandidateSignupDto) {
    return this.candidateAuthService.signup(dto);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Sign in as a candidate' })
  @ApiResponse({ status: 200, description: 'Authenticated; JWT issued' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  signin(@Body() dto: CandidateSigninDto) {
    return this.candidateAuthService.signin(dto);
  }
}
