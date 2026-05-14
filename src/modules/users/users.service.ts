import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';
import { Types } from 'mongoose';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: any) {
    this.logger.log(`Creating internal user record for: ${dto.email}`);
    try {
      const hashed = await bcrypt.hash(dto.password, 10);

      const userData: any = {
        ...dto,
        password: hashed,
      };

      if (dto.locationId && typeof dto.locationId === 'string') {
        userData.locationId = new Types.ObjectId(dto.locationId);
      }

      return this.usersRepository.create(userData);
    } catch (error) {
      this.logger.error(`Failed to create user record for ${dto.email}: ${error.message}`);
      throw new BadRequestException('We could not create the user account. This email might already be in use.');
    }
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      this.logger.warn(`User search failed: ID ${id} not found.`);
      throw new NotFoundException('The requested user could not be found.');
    }
    return user;
  }

  async findAll() {
    this.logger.log('Fetching all staff users.');
    return this.usersRepository.findAll();
  }

  async update(id: string, dto: any) {
    this.logger.log(`Updating user record for ID: ${id}`);
    const data: any = { ...dto };
    
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }
    
    if (dto.locationId && typeof dto.locationId === 'string') {
      data.locationId = new Types.ObjectId(dto.locationId);
    }

    const user = await this.usersRepository.update(id, data);
    if (!user) {
      this.logger.warn(`Update failed: User ID ${id} not found.`);
      throw new NotFoundException('Could not update user because the account was not found.');
    }

    this.logger.log(`User ID ${id} updated successfully.`);
    return user;
  }

  async toggleStatus(id: string) {
    this.logger.log(`Toggling activation status for user ID: ${id}`);
    const user = await this.findOne(id);
    const newStatus = !user.isActive;
    
    const updated = await this.usersRepository.update(id, { isActive: newStatus });
    this.logger.log(`User ID ${id} is now ${newStatus ? 'Active' : 'Inactive'}.`);
    
    return updated;
  }

  async findByRole(role: string) {
    return this.usersRepository.findByRole(role);
  }
}