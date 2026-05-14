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
import { CommissionRulesService } from '../commission-rules/commission-rules.service';
import { Product, ProductDocument } from '../products/schemas/product.schema';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly usersService: UsersService,
    private readonly commissionRulesService: CommissionRulesService,
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

  @OnEvent('order.cash_remitted')
  async handleOrderCashRemittedEvent(order: OrderDocument) {
    this.logger.log(`Handling financial transactions for order ${order._id}`);

    // Check if revenue has already been recorded for this order (Idempotency)
    const existingRevenue = await this.transactionModel.findOne({
      orderId: order._id,
      category: TransactionCategory.REVENUE,
    });
    if (existingRevenue) {
      this.logger.warn(`Financial transactions for order ${order._id} already recorded. Skipping.`);
      return;
    }

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

    // Atomic increment
    await this.walletModel.updateOne(
      { _id: systemWallet._id },
      { $inc: { balance: order.totalAmount } },
    );

    // 2. Process Agent Commission
    if (order.agentId) {
      try {
        const agent = await this.usersService.findOne(order.agentId.toString());
        if (agent) {
          let totalCommissionAmount = 0;
          for (const item of order.items) {
            const itemCommission = await this.commissionRulesService.calculateCommission(
              item.productId.toString(),
              item.qty,
              item.unitPrice * item.qty,
            );
            totalCommissionAmount += itemCommission;
          }

          if (totalCommissionAmount > 0) {
            const agentWallet = await this.getOrCreateWallet(order.agentId, WalletType.STAFF);

            // Debit System Wallet
            const sysCommissionTx = new this.transactionModel({
              orderId: order._id,
              walletId: systemWallet._id,
              amount: totalCommissionAmount,
              type: TransactionType.DEBIT,
              category: TransactionCategory.COMMISSION,
              description: `Commission payout for Order ${order._id} to Agent ${agent._id}`,
            });
            await sysCommissionTx.save();

            // Credit Agent Wallet
            const agentCommissionTx = new this.transactionModel({
              orderId: order._id,
              walletId: agentWallet._id,
              amount: totalCommissionAmount,
              type: TransactionType.CREDIT,
              category: TransactionCategory.COMMISSION,
              description: `Commission earned from Order ${order._id}`,
            });
            await agentCommissionTx.save();

            await this.walletModel.updateOne(
              { _id: systemWallet._id },
              { $inc: { balance: -totalCommissionAmount } },
            );
            await this.walletModel.updateOne(
              { _id: agentWallet._id },
              { $inc: { balance: totalCommissionAmount } },
            );
          }
        }
      } catch (err) {
        this.logger.error(`Failed to process commission for agent ${order.agentId}`, err);
      }
    }

    // 3. Record Delivery Fee (Debit System)
    if (order.deliveryFee > 0) {
      const deliveryTx = new this.transactionModel({
        orderId: order._id,
        walletId: systemWallet._id,
        amount: order.deliveryFee,
        type: TransactionType.DEBIT,
        category: TransactionCategory.LOGISTICS,
        description: `Delivery fee for Order ${order._id}`,
      });
      await deliveryTx.save();

      await this.walletModel.updateOne(
        { _id: systemWallet._id },
        { $inc: { balance: -order.deliveryFee } },
      );
    }

    // 4. Record Product Cost (COGS) (Debit System)
    let totalCogs = 0;
    for (const item of order.items) {
      const product = await this.productModel.findById(item.productId);
      if (product) {
        totalCogs += product.baseCost * item.qty;
      }
    }

    if (totalCogs > 0) {
      const cogsTx = new this.transactionModel({
        orderId: order._id,
        walletId: systemWallet._id,
        amount: totalCogs,
        type: TransactionType.DEBIT,
        category: TransactionCategory.COGS,
        description: `COGS for Order ${order._id}`,
      });
      await cogsTx.save();

      await this.walletModel.updateOne(
        { _id: systemWallet._id },
        { $inc: { balance: -totalCogs } },
      );
    }
  }
}
