import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from '../orders/schemas/order.schema';
import { SpendLog, SpendLogDocument } from '../media-buyers/schemas/spend-log.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Transaction, TransactionDocument, TransactionCategory, TransactionType } from '../finance/schemas/transaction.schema';
import { Wallet, WalletDocument } from '../finance/schemas/wallet.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(SpendLog.name) private spendLogModel: Model<SpendLogDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
  ) {}

  async getManagementDashboard() {
    // 1. Revenue (only CASH_REMITTED)
    const remittedOrders = await this.orderModel.find({ status: OrderStatus.CASH_REMITTED }).exec();
    const totalRevenue = remittedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    // 2. Ad Spend
    const spendLogs = await this.spendLogModel.find().exec();
    const totalAdSpend = spendLogs.reduce((sum, log) => sum + log.amountSpent, 0);

    // 3. Delivery Cost
    // Using delivered or remitted orders since delivery fee is set then
    const deliveredOrders = await this.orderModel.find({ 
      status: { $in: [OrderStatus.DELIVERED, OrderStatus.CASH_REMITTED] } 
    }).exec();
    const totalDeliveryCost = deliveredOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

    // 4. Commission
    const commissionTransactions = await this.transactionModel.find({ 
      category: TransactionCategory.COMMISSION 
    }).exec();
    const totalCommission = commissionTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    // 5. Product Cost (COGS)
    // We need to fetch product base costs
    const products = await this.productModel.find().exec();
    const productCostMap = products.reduce((map, p) => {
      map[p._id.toString()] = p.baseCost;
      return map;
    }, {});

    let totalProductCost = 0;
    for (const order of remittedOrders) {
      for (const item of order.items) {
        const baseCost = productCostMap[item.productId.toString()] || 0;
        totalProductCost += baseCost * item.qty;
      }
    }

    const totalProfit = totalRevenue - totalAdSpend - totalDeliveryCost - totalCommission - totalProductCost;

    // 6. System Metrics
    const totalScheduled = await this.orderModel.countDocuments({ status: { $ne: OrderStatus.CANCELLED } });
    const totalDelivered = await this.orderModel.countDocuments({ 
        status: { $in: [OrderStatus.DELIVERED, OrderStatus.CASH_REMITTED] } 
    });
    
    const deliveryRate = totalScheduled > 0 ? (totalDelivered / totalScheduled) * 100 : 0;
    const cpa = totalDelivered > 0 ? totalAdSpend / totalDelivered : 0;

    return {
      revenue: totalRevenue,
      adSpend: totalAdSpend,
      deliveryCost: totalDeliveryCost,
      commission: totalCommission,
      productCost: totalProductCost,
      profit: totalProfit,
      metrics: {
        deliveryRate: Number(deliveryRate.toFixed(2)),
        cpa: Number(cpa.toFixed(2)),
        totalOrders: totalScheduled,
        deliveredOrders: totalDelivered
      }
    };
  }

  async getCsDashboard(agentId: string) {
    const csId = new Types.ObjectId(agentId);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayDeliveriesCount = await this.orderModel.countDocuments({
      agentId: csId,
      status: { $in: [OrderStatus.DELIVERED, OrderStatus.CASH_REMITTED] },
      $or: [
        { deliveryDate: { $gte: startOfToday, $lte: endOfToday } },
        { deliveryDate: { $exists: false }, updatedAt: { $gte: startOfToday, $lte: endOfToday } }
      ]
    });

    const todayFollowUpCount = await this.orderModel.countDocuments({
      agentId: csId,
      followUpDate: { $gte: startOfToday, $lte: endOfToday }
    });

    const wallet = await this.walletModel.findOne({ userId: csId });
    let earnings = 0;
    if (wallet) {
      const commissionTransactions = await this.transactionModel.find({
        walletId: wallet._id,
        type: TransactionType.CREDIT,
        category: TransactionCategory.COMMISSION
      }).exec();
      earnings = commissionTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyDeliveryCount = await this.orderModel.countDocuments({
      agentId: csId,
      status: { $in: [OrderStatus.DELIVERED, OrderStatus.CASH_REMITTED] },
      $or: [
        { deliveryDate: { $gte: sevenDaysAgo } },
        { deliveryDate: { $exists: false }, updatedAt: { $gte: sevenDaysAgo } }
      ]
    });

    const weeklyProcessedCount = await this.orderModel.countDocuments({
      agentId: csId,
      status: { $in: [OrderStatus.DELIVERED, OrderStatus.CASH_REMITTED, OrderStatus.FAILED, OrderStatus.CANCELLED] },
      updatedAt: { $gte: sevenDaysAgo }
    });

    const rating = weeklyProcessedCount > 0
      ? (weeklyDeliveryCount / weeklyProcessedCount) * 100
      : 0;

    return {
      todayDeliveries: todayDeliveriesCount,
      todayFollowUpOrders: todayFollowUpCount,
      earnings,
      rating: Number(rating.toFixed(2)),
      metrics: {
        weeklyDelivery: weeklyDeliveryCount,
        weeklyProcessed: weeklyProcessedCount
      }
    };
  }
}
