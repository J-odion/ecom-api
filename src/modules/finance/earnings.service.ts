import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument, TransactionCategory } from './schemas/transaction.schema';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { UsersService } from '../users/users.service';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class EarningsService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    private usersService: UsersService,
  ) {}

  private buildFilterQuery(query: any) {
    const match: any = {};
    if (query.state) match.state = query.state;
    if (query.officeId) match.officeId = new Types.ObjectId(query.officeId);
    if (query.productId) match.productId = new Types.ObjectId(query.productId);
    
    if (query.date) {
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      
      switch (query.date) {
        case 'this_week':
          startDate.setDate(now.getDate() - now.getDay());
          break;
        case 'last_week':
          startDate.setDate(now.getDate() - now.getDay() - 7);
          endDate.setDate(now.getDate() - now.getDay() - 1);
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        default:
          if (query.startDate && query.endDate) {
            startDate = new Date(query.startDate);
            endDate = new Date(query.endDate);
          }
      }
      match.createdAt = { $gte: startDate, $lte: endDate };
    }
    
    return match;
  }

  async getEarnings(userIds: Types.ObjectId[], query: any) {
    const wallets = await this.walletModel.find({ userId: { $in: userIds } });
    const walletIds = wallets.map(w => w._id);

    const match = this.buildFilterQuery(query);
    match.walletId = { $in: walletIds };
    match.category = { $in: [TransactionCategory.COMMISSION, TransactionCategory.PAYOUT] };
    // Assuming commissions are earnings and payouts are withdrawals, 
    // to get total earnings we sum COMMISSION transactions.
    match.category = TransactionCategory.COMMISSION;

    const aggregation = await this.transactionModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    return {
      earnings: aggregation.length > 0 ? aggregation[0].total : 0
    };
  }

  async getMyEarnings(userId: string, query: any) {
    return this.getEarnings([new Types.ObjectId(userId)], query);
  }

  async getStaffEarnings(query: any) {
    // We assume staff are CUSTOMER_SERVICE, INVENTORY_MANAGER, LOGISTICS_MANAGER
    const staffIds = (await this.usersService.findAll())
      .filter((u: any) => [Role.CUSTOMER_SERVICE, Role.INVENTORY_MANAGER, Role.LOGISTICS_MANAGER].includes(u.legacyRole))
      .map((u: any) => new Types.ObjectId(u._id));
    return this.getEarnings(staffIds, query);
  }

  async getAgentEarnings(query: any) {
    // Assuming agents are DISPATCH_RIDER
    const agentIds = (await this.usersService.findAll())
      .filter((u: any) => u.legacyRole === Role.DISPATCH_RIDER)
      .map((u: any) => new Types.ObjectId(u._id));
    return this.getEarnings(agentIds, query);
  }

  async getReferralEarnings(query: any) {
    // Assuming referrals are MEDIA_BUYER
    const referralIds = (await this.usersService.findAll())
      .filter((u: any) => u.legacyRole === Role.MEDIA_BUYER)
      .map((u: any) => new Types.ObjectId(u._id));
    return this.getEarnings(referralIds, query);
  }
}
