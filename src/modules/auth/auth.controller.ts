import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Log in and get a JWT token' })
  @ApiResponse({ status: 200, description: 'Login successful. Returns access_token.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account not verified.' })
  async login(@Body() loginDto: LoginDto) {
    if (!loginDto) throw new BadRequestException('Login details are required.');
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    return this.authService.login(user);
  }

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Register a new staff member' })
  @ApiResponse({ status: 201, description: 'Account created. OTP sent to email.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async signup(@Body() registerDto: RegisterDto) {
    if (!registerDto) throw new BadRequestException('Registration details are required.');
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify email or reset-password OTP' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        email: { type: 'string', example: 'user@example.com' }, 
        otp: { type: 'string', example: '123456' } 
      } 
    } 
  })
  @ApiResponse({ status: 200, description: 'Verification successful.' })
  async verifyOtp(@Body() dto: { email: string; otp: string }) {
    if (!dto || !dto.email) throw new BadRequestException('Email and OTP are required.');
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Public()
  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend a new OTP to email' })
  @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'New OTP sent.' })
  async resendOtp(@Body() dto: { email: string }) {
    if (!dto || !dto.email) throw new BadRequestException('Email is required.');
    return this.authService.resendOtp(dto.email);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Reset code sent.' })
  async forgotPassword(@Body() dto: { email: string }) {
    if (!dto || !dto.email) throw new BadRequestException('Email is required.');
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        email: { type: 'string' }, 
        otp: { type: 'string' }, 
        newPass: { type: 'string' } 
      } 
    } 
  })
  @ApiResponse({ status: 200, description: 'Password updated successfully.' })
  async resetPassword(@Body() dto: { email: string; otp: string; newPass: string }) {
    if (!dto || !dto.email) throw new BadRequestException('Details are required.');
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPass);
  }
}
