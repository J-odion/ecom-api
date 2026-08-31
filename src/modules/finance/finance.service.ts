import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';

import { Transaction, TransactionDocument, TransactionType, TransactionCategory } from './schemas/transaction.schema';
import { Wallet, WalletDocument, WalletType } from './schemas/wallet.schema';
import { OrderDocument } from '../orders/schemas/order.schema';
import { CommissionRulesService } from '../commission-rules/commission-rules.service';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private commissionRulesService: CommissionRulesService,
    private usersService: UsersService,
  ) {}

  @OnEvent('order.cash_remitted')
  async handleOrderCashRemittedEvent(order: any) {
    const orderDoc = order as OrderDocument;
    this.logger.log(`Processing financial settlement for Order ${orderDoc._id}`);
    
    try {
      const state = orderDoc.customerState;
      const officeId = orderDoc.fulfillmentLocationId;

      // Iterate through items to record Revenue, COGS, and Commissions PER PRODUCT
      for (const item of orderDoc.items) {
        const itemRevenue = (orderDoc.totalAmount / orderDoc.items.reduce((sum, i) => sum + i.qty, 0)) * item.qty;

        // 1. Record Revenue to System Wallet (CREDIT) - Per Product
        await this.recordTransaction({
          userId: null,
          type: TransactionType.CREDIT,
          category: TransactionCategory.REVENUE,
          amount: itemRevenue,
          description: `Revenue from Order ${orderDoc._id} (Item: ${item.productId})`,
          orderId: orderDoc._id as Types.ObjectId,
          productId: item.productId,
          state,
          officeId,
        });

        // 2. Pay Commission to CS Agent
        if (orderDoc.agentId) {
          const commission = await this.commissionRulesService.calculateCommission(
            item.productId.toString(), 
            item.qty, 
            itemRevenue
          );

          if (commission > 0) {
            await this.recordTransaction({
              userId: orderDoc.agentId,
              type: TransactionType.CREDIT,
              category: TransactionCategory.COMMISSION,
              amount: commission,
              description: `Commission for Order ${orderDoc._id} (Item: ${item.productId})`,
              orderId: orderDoc._id as Types.ObjectId,
              productId: item.productId,
              state,
              officeId,
            });
          }
        }

        // 3. Record Product Cost (COGS) as a Debit to System
        const product = await this.productModel.findById(item.productId);
        if (product && product.baseCost > 0) {
          const itemCogs = product.baseCost * item.qty;
          await this.recordTransaction({
            userId: null,
            type: TransactionType.DEBIT,
            category: TransactionCategory.COGS,
            amount: itemCogs,
            description: `Product Cost (COGS) for Order ${orderDoc._id} (Item: ${item.productId})`,
            orderId: orderDoc._id as Types.ObjectId,
            productId: item.productId,
            state,
            officeId,
          });
        }
      }

      // 4. Pay Commission to Media Buyer (Overall, not per product currently as MB is based on total)
      if (orderDoc.sourceMediaBuyerId) {
        try {
          const mb = await this.usersService.findOne(orderDoc.sourceMediaBuyerId.toString());
          if (mb && mb.isActive) {
            const mbRate = mb.commissionRate !== undefined ? mb.commissionRate : 10;
            const mbCommission = (orderDoc.totalAmount * mbRate) / 100;
            if (mbCommission > 0) {
              await this.recordTransaction({
                userId: orderDoc.sourceMediaBuyerId,
                type: TransactionType.CREDIT,
                category: TransactionCategory.COMMISSION,
                amount: mbCommission,
                description: `Media Buyer Commission for Order ${orderDoc._id}`,
                orderId: orderDoc._id as Types.ObjectId,
                state,
                officeId,
              });
            }
          }
        } catch (e) {
          this.logger.error(`Failed to award Media Buyer commission: ${e.message}`);
        }
      }

      // 5. Record Delivery Fee as a Debit to System (Overall)
      if (orderDoc.deliveryFee > 0) {
        await this.recordTransaction({
          userId: null,
          type: TransactionType.DEBIT,
          category: TransactionCategory.LOGISTICS,
          amount: orderDoc.deliveryFee,
          description: `Logistics/Delivery Fee for Order ${orderDoc._id}`,
          orderId: orderDoc._id as Types.ObjectId,
          state,
          officeId,
        });
        this.logger.log(`Delivery fee of ${orderDoc.deliveryFee} debited for Order ${orderDoc._id}`);
      }

      this.logger.log(`Financial settlement for Order ${orderDoc._id} completed successfully.`);
    } catch (error) {
      this.logger.error(`Critical error during financial settlement for Order ${orderDoc._id}: ${error.message}`);
    }
  }

  async recordTransaction(data: any): Promise<Transaction> {
    const { userId, ...transactionData } = data;
    const wallet = await this.getOrCreateWallet(userId);
    
    const transaction = new this.transactionModel({
      ...transactionData,
      walletId: wallet._id,
    });
    const saved = await transaction.save();

    const adjustment = data.type === TransactionType.CREDIT ? data.amount : -data.amount;
    
    await this.walletModel.findByIdAndUpdate(
      wallet._id,
      { $inc: { balance: adjustment } }
    );

    return saved;
  }

  private async getOrCreateWallet(userId?: Types.ObjectId | null): Promise<WalletDocument> {
    const filter = userId ? { userId } : { type: WalletType.SYSTEM };
    let wallet = await this.walletModel.findOne(filter);
    
    if (!wallet) {
      wallet = new this.walletModel({
        userId: userId || null,
        type: userId ? WalletType.STAFF : WalletType.SYSTEM,
        balance: 0,
      });
      await wallet.save();
    }
    return wallet;
  }

  async getWalletBalance(userId?: string): Promise<number> {
    const filter = userId ? { userId: new Types.ObjectId(userId) } : { type: WalletType.SYSTEM };
    const wallet = await this.walletModel.findOne(filter);
    return wallet ? wallet.balance : 0;
  }

  async getSystemRevenue(): Promise<number> {
    return this.getWalletBalance();
  }

  async getTransactions(userId?: string): Promise<Transaction[]> {
    const wallet = await this.getOrCreateWallet(userId ? new Types.ObjectId(userId) : null);
    return this.transactionModel.find({ walletId: wallet._id }).sort({ createdAt: -1 }).exec();
  }

  private buildFilterQuery(query: any) {
    const match: any = {};
    
    if (query.state) {
      match.state = query.state;
    }
    if (query.officeId) {
      match.officeId = new Types.ObjectId(query.officeId);
    }
    if (query.productId) {
      match.productId = new Types.ObjectId(query.productId);
    }
    
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

  async getCashFlow(query: any) {
    const match = this.buildFilterQuery(query);
    
    const aggregation = await this.transactionModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    let inflow = 0;
    let outflow = 0;
    
    aggregation.forEach(item => {
      if (item._id === TransactionType.CREDIT) inflow = item.total;
      if (item._id === TransactionType.DEBIT) outflow = item.total;
    });
    
    return {
      inflow,
      outflow,
      net: inflow - outflow
    };
  }

  async getBankInflow(query: any) {
    const match = this.buildFilterQuery(query);
    match.category = TransactionCategory.REVENUE;
    
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
      inflow: aggregation.length > 0 ? aggregation[0].total : 0
    };
  }

  async getExpense(query: any) {
    const match = this.buildFilterQuery(query);
    match.category = { $in: [TransactionCategory.COGS, TransactionCategory.LOGISTICS, TransactionCategory.COMMISSION, TransactionCategory.PAYOUT] };
    match.type = TransactionType.DEBIT; // Note: Commissions are currently CREDITS to user wallets, but DEBITS to system? Wait, the recordTransaction does NOT explicitly create double entries. It creates ONE transaction tied to a wallet. If it's a CREDIT to an agent's wallet, it's an expense for the system.
    
    // To properly calculate expenses from the system's perspective, we should look at ALL COGS, LOGISTICS (which are DEBITs on System wallet), and COMMISSIONS/PAYOUTS (which are CREDITs on user wallets).
    
    // Actually, a better approach for expenses is just matching categories:
    const expenseMatch = {
      ...this.buildFilterQuery(query),
      category: { $in: [TransactionCategory.COGS, TransactionCategory.LOGISTICS, TransactionCategory.COMMISSION, TransactionCategory.PAYOUT] }
    };
    
    const aggregation = await this.transactionModel.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const expenses = {
      total: 0,
      breakdown: {}
    };
    
    aggregation.forEach(item => {
      expenses.breakdown[item._id] = item.total;
      expenses.total += item.total;
    });
    
    return expenses;
  }
}
