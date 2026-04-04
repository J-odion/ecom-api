import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersRepository } from '../users/repositories/users.repository';
import { User, UserDocument } from '../users/schemas/user.schema';



@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) throw new UnauthorizedException();

    const match = await bcrypt.compare(pass, user.password);
    if (!match) throw new UnauthorizedException();

    return user;
  }

  async login(user: UserDocument) {
    const payload = { sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
