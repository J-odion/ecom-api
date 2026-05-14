import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // 2. Create User (Unverified)
    const user = await this.usersService.create({
      ...dto,
      role: Role.CUSTOMER_SERVICE,
      otp,
      otpExpiresAt,
      isVerified: false,
    });

    // 3. Simulate sending email
    this.logger.log(`[EMAIL SIMULATION] To: ${dto.email} | OTP: ${otp}`);

    return {
      message: 'Registration successful. Please check your email for the OTP.',
      userId: user._id,
    };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');

    if (user.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (new Date() > user.otpExpiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    // Mark as verified
    await this.usersService.update(user._id.toString(), {
      isVerified: true,
      otp: null,
      otpExpiresAt: null,
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async validateUser(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const match = await bcrypt.compare(pass, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(user: UserDocument) {
    const payload = { sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
