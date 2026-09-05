import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { CheckSlugQueryDto } from './dto/check-slug-query.dto';
import { SigninDto } from './dto/signin.dto';
import { SignupCompanyDto } from './dto/signup-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { RecruiterAuthGuard } from './guards/recruiter-auth.guard';
import type { AuthenticatedRecruiter } from './types/auth-user.type';
import type { SafeUser } from './types/safe-user.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('company/signup')
  @ApiOperation({ summary: 'Register a company and first admin user' })
  @ApiResponse({ status: 201, description: 'Company and user created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email or slug already taken' })
  signupCompany(@Body() dto: SignupCompanyDto) {
    return this.authService.signupCompany(dto);
  }

  @Post('signin')
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiResponse({ status: 200, description: 'Authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  signin(@Body() dto: SigninDto) {
    return this.authService.signin(dto);
  }

  @Get('me')
  @UseGuards(RecruiterAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: SafeUser): SafeUser {
    return user;
  }

  @Patch('company')
  @UseGuards(RecruiterAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the current recruiter's company (name/slug)" })
  @ApiResponse({ status: 200, description: 'Company updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Workspace URL already taken' })
  updateCompany(
    @CurrentUser() user: AuthenticatedRecruiter,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.authService.updateCompany(user.companyId, dto);
  }

  @Get('company/slug-available')
  @UseGuards(RecruiterAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check whether a workspace URL (slug) is available' })
  @ApiResponse({ status: 200, description: '{ available: boolean }' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkSlugAvailable(
    @CurrentUser() user: AuthenticatedRecruiter,
    @Query() query: CheckSlugQueryDto,
  ): Promise<{ available: boolean }> {
    const available = await this.authService.isSlugAvailable(query.slug, user.companyId);
    return { available };
  }
}
