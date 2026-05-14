import { Injectable, UnauthorizedException, BadRequestException, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../../common/enums/role.enum';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    this.logger.log(`Attempting to register new user: ${dto.email}`);
    
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      this.logger.warn(`Registration failed: Email ${dto.email} is already in use.`);
      throw new ConflictException('This email address is already registered. Please log in or use a different email.');
    }

    const otp = this.generateOtp();
    const otpExpiresAt = this.getOtpExpiry();

    try {
      const user = await this.usersService.create({
        ...dto,
        role: Role.CUSTOMER_SERVICE,
        otp,
        otpExpiresAt,
        isVerified: false,
      });

      this.logger.log(`User registered successfully: ${dto.email}. OTP generated.`);
      
      // Real Email Integration
      await this.mailService.sendOtp(dto.email, otp, dto.name);

      return {
        message: 'Account created successfully! We have sent a 6-digit verification code to your email.',
        userId: user._id,
      };
    } catch (error) {
      this.logger.error(`Error during user registration for ${dto.email}: ${error.message}`);
      throw new BadRequestException('We encountered an issue creating your account. Please check your details and try again.');
    }
  }

  async resendOtp(email: string) {
    this.logger.log(`Request to resend OTP for: ${email}`);
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      this.logger.warn(`Resend OTP failed: User with email ${email} not found.`);
      throw new NotFoundException('We could not find an account with that email address.');
    }

    const otp = this.generateOtp();
    const otpExpiresAt = this.getOtpExpiry();

    await this.usersService.update(user._id.toString(), {
      otp,
      otpExpiresAt,
    });

    this.logger.log(`New OTP generated and sent to ${email}`);
    
    // Real Email Integration
    await this.mailService.sendOtp(email, otp, user.name);

    return { message: 'A new verification code has been sent to your email. It will expire in 10 minutes.' };
  }

  async verifyOtp(email: string, otp: string) {
    this.logger.log(`Attempting OTP verification for: ${email}`);
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      this.logger.warn(`OTP verification failed: User ${email} not found.`);
      throw new BadRequestException('Verification failed. The account associated with this email does not exist.');
    }

    if (user.otp !== otp) {
      this.logger.warn(`OTP verification failed: Invalid code provided for ${email}.`);
      throw new BadRequestException('The verification code you entered is incorrect. Please double-check your email.');
    }

    if (new Date() > user.otpExpiresAt) {
      this.logger.warn(`OTP verification failed: Code expired for ${email}.`);
      throw new BadRequestException('This verification code has expired. Please request a new one.');
    }

    await this.usersService.update(user._id.toString(), {
      isVerified: true,
      otp: null,
      otpExpiresAt: null,
    });

    this.logger.log(`Email verified successfully for: ${email}`);
    return { message: 'Your email has been verified! You can now log in to your account.' };
  }

  async forgotPassword(email: string) {
    this.logger.log(`Password reset requested for: ${email}`);
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      this.logger.warn(`Password reset failed: User ${email} not found.`);
      throw new NotFoundException('No account found with this email address.');
    }

    const otp = this.generateOtp();
    const otpExpiresAt = this.getOtpExpiry();

    await this.usersService.update(user._id.toString(), {
      otp,
      otpExpiresAt,
    });

    this.logger.log(`Password reset OTP sent to ${email}`);
    
    // Real Email Integration
    await this.mailService.sendOtp(email, otp, user.name);

    return { message: 'We have sent a password reset code to your email. Please use it to set a new password.' };
  }

  async resetPassword(email: string, otp: string, newPass: string) {
    this.logger.log(`Attempting password reset for: ${email}`);
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      this.logger.warn(`Password reset failed: User ${email} not found.`);
      throw new BadRequestException('Account not found. We cannot reset the password.');
    }

    if (user.otp !== otp) {
      this.logger.warn(`Password reset failed: Invalid OTP for ${email}.`);
      throw new BadRequestException('The reset code you provided is invalid.');
    }

    if (new Date() > user.otpExpiresAt) {
      this.logger.warn(`Password reset failed: OTP expired for ${email}.`);
      throw new BadRequestException('The reset code has expired. Please request a new one.');
    }

    await this.usersService.update(user._id.toString(), {
      password: newPass,
      otp: null,
      otpExpiresAt: null,
    });

    this.logger.log(`Password reset successfully for: ${email}`);
    return { message: 'Your password has been updated successfully. You can now log in with your new password.' };
  }

  async validateUser(email: string, pass: string) {
    this.logger.log(`Validating login credentials for: ${email}`);
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      this.logger.warn(`Login failed: User ${email} not found.`);
      throw new UnauthorizedException('Incorrect email or password. Please try again.');
    }

    if (!user.isVerified) {
      this.logger.warn(`Login failed: Account ${email} is not verified.`);
      throw new UnauthorizedException('Your email is not verified yet. Please check your inbox for the verification code.');
    }

    if (!user.isActive) {
      this.logger.warn(`Login failed: Account ${email} is deactivated.`);
      throw new UnauthorizedException('Your account has been deactivated. Please contact your manager for assistance.');
    }

    const match = await bcrypt.compare(pass, user.password);
    if (!match) {
      this.logger.warn(`Login failed: Incorrect password for ${email}.`);
      throw new UnauthorizedException('Incorrect email or password. Please try again.');
    }

    return user;
  }

  async login(user: UserDocument) {
    this.logger.log(`Login successful for user: ${user.email} (Role: ${user.role})`);
    const payload = { sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getOtpExpiry(): Date {
    return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  }
}
