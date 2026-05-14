import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';
import { Types } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto) {
    const hashed = await bcrypt.hash(dto.password, 10);

    const userData: any = {
      ...dto,
      password: hashed,
    };

    if (dto.locationId) {
      userData.locationId = new Types.ObjectId(dto.locationId);
    }

    return this.usersRepository.create(userData);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll() {
    return this.usersRepository.findAll();
  }

  async update(id: string, dto: Partial<CreateUserDto>) {
    const data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }
    if (dto.locationId) {
      data.locationId = new Types.ObjectId(dto.locationId);
    }
    const user = await this.usersRepository.update(id, data);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async toggleStatus(id: string) {
    const user = await this.findOne(id);
    return this.usersRepository.update(id, { isActive: !user.isActive });
  }

  async findByRole(role: string) {
    return this.usersRepository.findByRole(role);
  }
}