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
    const sanitizedEmail = dto.email.toLowerCase().trim();
    
    const existingUser = await this.usersService.findByEmail(sanitizedEmail);
    if (existingUser) {
      throw new ConflictException('This email address is already registered.');
    }

    const otp = this.generateOtp();
    const otpExpiresAt = this.getOtpExpiry();

    try {
      const user = await this.usersService.create({
        ...dto,
        email: sanitizedEmail,
        role: dto.role || Role.CUSTOMER_SERVICE,
        otp,
        otpExpiresAt,
        isVerified: false,
      });

      // Send real email
      await this.mailService.sendOtp(sanitizedEmail, otp, dto.fullName);
      this.logger.log(`New staff member registered: ${sanitizedEmail}`);

      return {
        success: true,
        message: 'Account created! Please check your email for the 6-digit verification code.',
        userId: user._id,
      };
    } catch (error) {
      this.logger.error(`Registration error for ${sanitizedEmail}: ${error.message}`);
      throw new BadRequestException('Could not create account. Please check your details.');
    }
  }

  async resendOtp(email: string) {
    const sanitizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(sanitizedEmail);
    if (!user) {
      throw new NotFoundException('Account not found.');
    }

    const otp = this.generateOtp();
    const otpExpiresAt = this.getOtpExpiry();

    await this.usersService.update(user._id.toString(), {
      otp,
      otpExpiresAt,
    });

    await this.mailService.sendOtp(sanitizedEmail, otp, user.fullName);
    this.logger.log(`New OTP sent to ${sanitizedEmail}`);

    return { success: true, message: 'A new code has been sent to your email.' };
  }

  async verifyOtp(email: string, otp: string) {
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedOtp = otp.toString().trim();

    const user = await this.usersService.findByEmail(sanitizedEmail);
    if (!user) {
      throw new BadRequestException('Verification failed. Account not found.');
    }

    // Handle "Already Verified" case (prevents errors on double-click)
    if (user.isVerified) {
      this.logger.log(`User ${sanitizedEmail} already verified. Returning success.`);
      return { success: true, message: 'Email already verified! You can now log in.' };
    }

    if (user.otp !== sanitizedOtp) {
      this.logger.warn(`Failed verification attempt for ${sanitizedEmail}: Incorrect OTP.`);
      throw new BadRequestException('The verification code is incorrect.');
    }

    if (new Date() > user.otpExpiresAt) {
      throw new BadRequestException('This code has expired. Please request a new one.');
    }

    await this.usersService.update(user._id.toString(), {
      isVerified: true,
      otp: null,
      otpExpiresAt: null,
    });

    this.logger.log(`User ${sanitizedEmail} verified successfully.`);
    return { success: true, message: 'Email verified! You can now log in.' };
  }

  async forgotPassword(email: string) {
    const sanitizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(sanitizedEmail);
    if (!user) {
      throw new NotFoundException('No account found with this email.');
    }

    const otp = this.generateOtp();
    const otpExpiresAt = this.getOtpExpiry();

    await this.usersService.update(user._id.toString(), {
      otp,
      otpExpiresAt,
    });

    await this.mailService.sendOtp(user.email, otp, user.fullName);
    return { success: true, message: 'Reset code sent to your email.' };
  }

  async resetPassword(email: string, otp: string, newPass: string) {
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedOtp = otp.toString().trim();

    const user = await this.usersService.findByEmail(sanitizedEmail);
    if (!user) {
      throw new BadRequestException('Account not found.');
    }

    if (user.otp !== sanitizedOtp) {
      throw new BadRequestException('Invalid reset code.');
    }

    if (new Date() > user.otpExpiresAt) {
      throw new BadRequestException('Reset code has expired.');
    }

    // We pass the raw password; UsersService.update handles the hashing
    await this.usersService.update(user._id.toString(), {
      password: newPass,
      otp: null,
      otpExpiresAt: null,
    });

    this.logger.log(`Password reset successful for ${sanitizedEmail}`);
    return { success: true, message: 'Password updated successfully.' };
  }

  async validateUser(email: string, pass: string) {
    const sanitizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(sanitizedEmail);
    
    if (!user) {
      throw new UnauthorizedException('Incorrect email or password.');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in.');
    }

    const match = await bcrypt.compare(pass, user.password);
    if (!match) {
      throw new UnauthorizedException('Incorrect email or password.');
    }

    return user;
  }

  async login(user: UserDocument) {
    await this.usersService.update(user._id.toString(), { isOnline: true });
    const payload = { sub: user._id, role: user.role };
    return {
      success: true,
      access_token: this.jwtService.sign(payload),
    };
  }

  async logout(userId: string) {
    await this.usersService.update(userId, { isOnline: false });
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getOtpExpiry(): Date {
    return new Date(Date.now() + 10 * 60 * 1000); // 10 mins
  }
}
