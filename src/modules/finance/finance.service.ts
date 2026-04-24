import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';

import { Wallet, WalletDocument, WalletType } from './schemas/wallet.schema';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
  TransactionCategory,
} from './schemas/transaction.schema';
import type { OrderDocument } from '../orders/schemas/order.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    private readonly usersService: UsersService,
  ) {}

  async getWalletBalance(userId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(new Types.ObjectId(userId), WalletType.STAFF);
    return wallet.balance;
  }

  async getSystemRevenue(): Promise<number> {
    const wallet = await this.getSystemWallet();
    return wallet.balance;
  }

  private async getOrCreateWallet(userId: Types.ObjectId, type: WalletType): Promise<WalletDocument> {
    let wallet = await this.walletModel.findOne({ userId, type }).exec();
    if (!wallet) {
      wallet = new this.walletModel({ userId, type, balance: 0 });
      await wallet.save();
    }
    return wallet;
  }

  private async getSystemWallet(): Promise<WalletDocument> {
    let wallet = await this.walletModel.findOne({ type: WalletType.SYSTEM }).exec();
    if (!wallet) {
      wallet = new this.walletModel({ type: WalletType.SYSTEM, balance: 0 });
      await wallet.save();
    }
    return wallet;
  }

  @OnEvent('order.delivered')
  async handleOrderDeliveredEvent(order: OrderDocument) {
    this.logger.log(`Handling financial transaction for order ${order._id}`);

    const systemWallet = await this.getSystemWallet();

    // 1. Record Gross Revenue to System Wallet
    const revenueTx = new this.transactionModel({
      orderId: order._id,
      walletId: systemWallet._id,
      amount: order.totalAmount,
      type: TransactionType.CREDIT,
      category: TransactionCategory.REVENUE,
      description: `Revenue from Order ${order._id}`,
    });
    await revenueTx.save();

    systemWallet.balance += order.totalAmount;

    // 2. Calculate and process Agent Commission
    if (order.agentId) {
      try {
        const agent = await this.usersService.findOne(order.agentId.toString());
        if (agent) {
          const commissionRate = agent.commissionRate || 10;
          const commissionAmount = (order.totalAmount * commissionRate) / 100;

          const agentWallet = await this.getOrCreateWallet(order.agentId, WalletType.STAFF);

          // Debit System Wallet for Commission
          const sysCommissionTx = new this.transactionModel({
            orderId: order._id,
            walletId: systemWallet._id,
            amount: commissionAmount,
            type: TransactionType.DEBIT,
            category: TransactionCategory.COMMISSION,
            description: `Commission payout for Order ${order._id} to Agent ${agent._id}`,
          });
          await sysCommissionTx.save();

          systemWallet.balance -= commissionAmount;

          // Credit Agent Wallet
          const agentCommissionTx = new this.transactionModel({
            orderId: order._id,
            walletId: agentWallet._id,
            amount: commissionAmount,
            type: TransactionType.CREDIT,
            category: TransactionCategory.COMMISSION,
            description: `Commission earned from Order ${order._id}`,
          });
          await agentCommissionTx.save();

          agentWallet.balance += commissionAmount;
          await agentWallet.save();
        }
      } catch (err) {
        this.logger.error(`Failed to process commission for agent ${order.agentId}`, err);
      }
    }

    await systemWallet.save();
  }
}
