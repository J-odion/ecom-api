import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Log in and get a JWT token' })
  @ApiResponse({ status: 201, description: 'Login successful' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    return this.authService.login(user);
  }

  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  async signup(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify email or reset-password OTP' })
  async verifyOtp(@Body() dto: { email: string; otp: string }) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend a new OTP' })
  async resendOtp(@Body() dto: { email: string }) {
    return this.authService.resendOtp(dto.email);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  async forgotPassword(@Body() dto: { email: string }) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP' })
  async resetPassword(@Body() dto: { email: string; otp: string; newPass: string }) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPass);
  }
}
