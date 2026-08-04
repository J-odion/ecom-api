import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersRepository } from './repositories/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';
import { Wallet, WalletDocument } from '../finance/schemas/wallet.schema';
import { Transaction, TransactionDocument } from '../finance/schemas/transaction.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async create(dto: any) {
    this.logger.log(`Creating internal user record for: ${dto.email}`);
    try {
      const rawPassword = dto.password || 'Welcome@123';
      const hashed = await bcrypt.hash(rawPassword, 10);

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
    const users = await this.usersRepository.findAll();

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const userId = user._id;

        // 1. Available/current commission from wallet balance
        const wallet = await this.walletModel.findOne({ userId });
        const currentCommission = wallet ? wallet.balance : 0;

        // 2. Sum all CREDIT transactions of category COMMISSION for all-time commissions
        let allTimeCommissions = 0;
        if (wallet) {
          const commissionTx = await this.transactionModel.find({
            walletId: wallet._id,
            type: 'CREDIT',
            category: 'COMMISSION',
          }).exec();
          allTimeCommissions = commissionTx.reduce((sum, tx) => sum + tx.amount, 0);
        }

        // 3. Sum all CREDIT transactions of category PAYOUT (representing explicit payouts/salary)
        let totalAllTimeSalaryEarned = 0;
        if (wallet) {
          const payoutTx = await this.transactionModel.find({
            walletId: wallet._id,
            type: 'CREDIT',
            category: 'PAYOUT',
          }).exec();
          totalAllTimeSalaryEarned = payoutTx.reduce((sum, tx) => sum + tx.amount, 0);
        }

        // Fallback: estimate salary based on elapsed months since user creation if no explicit payouts
        if (totalAllTimeSalaryEarned === 0 && user.salary) {
          const createdAt = (user as any).createdAt || new Date();
          const monthsElapsed = Math.max(
            1,
            Math.ceil((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
          );
          totalAllTimeSalaryEarned = user.salary * monthsElapsed;
        }

        const userObj = user.toObject ? user.toObject() : user;
        return {
          ...userObj,
          currentCommission,
          allTimeCommissions,
          totalAllTimeSalaryEarned,
        };
      })
    );

    return usersWithStats;
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

  async updateRole(id: string, role: Role) {
    this.logger.log(`Updating role to ${role} for user ID: ${id}`);
    const user = await this.usersRepository.update(id, { role });
    if (!user) {
      this.logger.warn(`Role update failed: User ID ${id} not found.`);
      throw new NotFoundException('Could not update role because the account was not found.');
    }
    this.logger.log(`User ID ${id} role updated to ${role} successfully.`);
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