import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SpendLog, SpendLogDocument } from './schemas/spend-log.schema';
import { CreateSpendLogDto } from './dto/create-spend-log.dto';
import { Lead, LeadDocument } from '../leads/schemas/lead.schema';
import { Order, OrderDocument, OrderStatus } from '../orders/schemas/order.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Transaction, TransactionDocument, TransactionType, TransactionCategory } from '../finance/schemas/transaction.schema';
import { Wallet, WalletDocument } from '../finance/schemas/wallet.schema';

@Injectable()
export class MediaBuyersService {
  constructor(
    @InjectModel(SpendLog.name) private spendLogModel: Model<SpendLogDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
  ) {}

  async createSpendLog(createSpendLogDto: CreateSpendLogDto): Promise<SpendLog> {
    const balance = createSpendLogDto.amountReceived - createSpendLogDto.amountSpent;
    const { product_name, ...rest } = createSpendLogDto as any;
    
    const spendLog = new this.spendLogModel({
      ...rest,
      productName: product_name,
      mediaBuyerId: new Types.ObjectId(createSpendLogDto.mediaBuyerId),
      date: new Date(createSpendLogDto.date),
      balance,
    });

    return spendLog.save();
  }

  async getPerformanceMetrics(mediaBuyerId: string, range: string, customDate?: string) {
    const mbId = new Types.ObjectId(mediaBuyerId);
    
    let startDate: Date;
    let endDate: Date;
    const now = new Date();
    
    switch (range) {
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'last_week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'custom':
        if (customDate) {
          startDate = new Date(customDate);
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        }
        break;
      case 'today':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
    }

    const dateFilter = { $gte: startDate, $lt: endDate };
    
    // 1. Get Spend Logs
    const logs = await this.spendLogModel.find({ 
      mediaBuyerId: mbId,
      date: dateFilter
    }).exec();
    const totalSpent = logs.reduce((sum, log) => sum + log.amountSpent, 0);
    const totalReceived = logs.reduce((sum, log) => sum + log.amountReceived, 0);

    // 2. Aggregate Leads
    const leads = await this.leadModel.find({ 
      sourceMediaBuyerId: mbId,
      createdAt: dateFilter 
    }).select('_id').exec();
    
    const leadsCount = leads.length;
    const leadIdArray = leads.map(l => l._id);

    // 3. Aggregate Orders originating from these Leads
    // Count scheduled orders (all orders originating from these leads)
    const scheduledOrdersCount = await this.orderModel.countDocuments({ 
      leadId: { $in: leadIdArray } 
    });

    // Count delivered orders
    const deliveredOrdersCount = await this.orderModel.countDocuments({ 
      leadId: { $in: leadIdArray },
      status: { $in: [OrderStatus.DELIVERED, OrderStatus.CASH_REMITTED] }
    });

    const deliveryRate = scheduledOrdersCount > 0 
      ? (deliveredOrdersCount / scheduledOrdersCount) * 100 
      : 0;

    const cpa = deliveredOrdersCount > 0 
      ? totalSpent / deliveredOrdersCount 
      : 0;

    return {
      totalSpent,
      totalReceived,
      balance: totalReceived - totalSpent,
      leadsGenerated: leadsCount,
      scheduledOrders: scheduledOrdersCount,
      deliveredOrders: deliveredOrdersCount,
      deliveryRate: Number(deliveryRate.toFixed(2)),
      cpa: Number(cpa.toFixed(2))
    };
  }

  async getTeamDashboard() {
    const mediaBuyers = await this.userModel.find({ role: 'media_buyer', isActive: true }).exec();

    const teamGroups = new Map<string, any[]>();
    for (const mb of mediaBuyers) {
      const team = mb.team || 'Unassigned';
      if (!teamGroups.has(team)) {
        teamGroups.set(team, []);
      }
      teamGroups.get(team)!.push(mb);
    }

    const results: any[] = [];

    for (const [teamName, mbs] of teamGroups.entries()) {
      const mbIds = mbs.map(mb => mb._id);

      const spendLogs = await this.spendLogModel.find({ mediaBuyerId: { $in: mbIds } }).exec();
      const spent = spendLogs.reduce((sum, log) => sum + log.amountSpent, 0);

      const leads = await this.leadModel.find({ sourceMediaBuyerId: { $in: mbIds } }).select('_id').exec();
      const leadIds = leads.map(l => l._id);

      const orderCounts = await this.orderModel.countDocuments({ leadId: { $in: leadIds } });

      const deliveredOrdersCount = await this.orderModel.countDocuments({
        leadId: { $in: leadIds },
        status: { $in: [OrderStatus.DELIVERED, OrderStatus.CASH_REMITTED] },
      });

      const deliveryRate = orderCounts > 0 ? (deliveredOrdersCount / orderCounts) * 100 : 0;

      const remittedOrders = await this.orderModel.find({
        leadId: { $in: leadIds },
        status: OrderStatus.CASH_REMITTED,
      }).select('totalAmount').exec();
      const earnings = remittedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const wallets = await this.walletModel.find({ userId: { $in: mbIds } }).exec();
      const walletIds = wallets.map(w => w._id);
      const commissionTx = await this.transactionModel.find({
        walletId: { $in: walletIds },
        type: TransactionType.CREDIT,
        category: TransactionCategory.COMMISSION,
      }).exec();
      const commissions = commissionTx.reduce((sum, tx) => sum + tx.amount, 0);

      results.push({
        team: teamName,
        spent,
        orderCounts,
        deliveryRate: Number(deliveryRate.toFixed(2)),
        earnings,
        commissions,
      });
    }

    return results;
  }
}
