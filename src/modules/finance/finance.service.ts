import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';

import { Transaction, TransactionDocument, TransactionType, TransactionCategory } from './schemas/transaction.schema';
import { Wallet, WalletDocument, WalletType } from './schemas/wallet.schema';
import { OrderDocument } from '../orders/schemas/order.schema';
import { CommissionRulesService } from '../commission-rules/commission-rules.service';
import { Product, ProductDocument } from '../products/schemas/product.schema';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private commissionRulesService: CommissionRulesService,
  ) {}

  @OnEvent('order.cash_remitted')
  async handleOrderCashRemittedEvent(order: any) {
    const orderDoc = order as OrderDocument;
    this.logger.log(`Processing financial settlement for Order ${orderDoc._id}`);
    
    try {
      // 1. Record Revenue to System Wallet (CREDIT)
      await this.recordTransaction({
        userId: null,
        type: TransactionType.CREDIT,
        category: TransactionCategory.REVENUE,
        amount: orderDoc.totalAmount,
        description: `Revenue from Order ${orderDoc._id}`,
        orderId: orderDoc._id as Types.ObjectId,
      });

      // 2. Pay Commission to CS Agent (Sum of commissions for each item)
      if (orderDoc.agentId) {
        let totalCommission = 0;
        for (const item of orderDoc.items) {
          const itemTotal = (orderDoc.totalAmount / orderDoc.items.reduce((sum, i) => sum + i.qty, 0)) * item.qty;
          const commission = await this.commissionRulesService.calculateCommission(
            item.productId.toString(), 
            item.qty, 
            itemTotal
          );
          totalCommission += commission;
        }

        if (totalCommission > 0) {
          await this.recordTransaction({
            userId: orderDoc.agentId,
            type: TransactionType.CREDIT,
            category: TransactionCategory.COMMISSION,
            amount: totalCommission,
            description: `Commission for Order ${orderDoc._id}`,
            orderId: orderDoc._id as Types.ObjectId,
          });
          this.logger.log(`Total Commission of ${totalCommission} awarded to Agent ${orderDoc.agentId}`);
        }
      }

      // 3. Record Product Cost (COGS) as a Debit to System
      let totalCogs = 0;
      for (const item of orderDoc.items) {
        const product = await this.productModel.findById(item.productId);
        if (product) {
          totalCogs += (product.baseCost * item.qty);
        }
      }

      if (totalCogs > 0) {
        await this.recordTransaction({
          userId: null,
          type: TransactionType.DEBIT,
          category: TransactionCategory.COGS,
          amount: totalCogs,
          description: `Product Cost (COGS) for Order ${orderDoc._id}`,
          orderId: orderDoc._id as Types.ObjectId,
        });
        this.logger.log(`COGS of ${totalCogs} debited for Order ${orderDoc._id}`);
      }

      // 4. Record Delivery Fee as a Debit to System
      if (orderDoc.deliveryFee > 0) {
        await this.recordTransaction({
          userId: null,
          type: TransactionType.DEBIT,
          category: TransactionCategory.LOGISTICS,
          amount: orderDoc.deliveryFee,
          description: `Logistics/Delivery Fee for Order ${orderDoc._id}`,
          orderId: orderDoc._id as Types.ObjectId,
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
}
