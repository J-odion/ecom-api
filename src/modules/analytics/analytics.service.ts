import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from '../orders/schemas/order.schema';
import { SpendLog, SpendLogDocument } from '../media-buyers/schemas/spend-log.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Transaction, TransactionDocument, TransactionCategory, TransactionType } from '../finance/schemas/transaction.schema';
import { Wallet, WalletDocument } from '../finance/schemas/wallet.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Delivery, DeliveryDocument, DeliveryStatus } from '../logistics/schemas/delivery.schema';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(SpendLog.name) private spendLogModel: Model<SpendLogDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Delivery.name) private deliveryModel: Model<DeliveryDocument>,
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

    const userDoc = await this.userModel.findById(csId);
    const salary = userDoc?.salary || 0;
    earnings += salary;

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

  async getLogisticsDashboard(agentId: string) {
    const deliveryAgentId = new Types.ObjectId(agentId);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayAssignedCount = await this.deliveryModel.countDocuments({
      deliveryAgentId,
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    });

    const todayCompletedCount = await this.deliveryModel.countDocuments({
      deliveryAgentId,
      status: DeliveryStatus.COMPLETED,
      updatedAt: { $gte: startOfToday, $lte: endOfToday }
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyCompletedCount = await this.deliveryModel.countDocuments({
      deliveryAgentId,
      status: DeliveryStatus.COMPLETED,
      updatedAt: { $gte: sevenDaysAgo }
    });

    const weeklyFailedCount = await this.deliveryModel.countDocuments({
      deliveryAgentId,
      status: DeliveryStatus.FAILED,
      updatedAt: { $gte: sevenDaysAgo }
    });

    const totalWeekly = weeklyCompletedCount + weeklyFailedCount;
    const deliveryRate = totalWeekly > 0 ? (weeklyCompletedCount / totalWeekly) * 100 : 0;

    const wallet = await this.walletModel.findOne({ userId: deliveryAgentId });
    let earnings = 0;
    if (wallet) {
      const creditTransactions = await this.transactionModel.find({
        walletId: wallet._id,
        type: TransactionType.CREDIT
      }).exec();
      earnings = creditTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    }

    const userDoc = await this.userModel.findById(deliveryAgentId);
    const salary = userDoc?.salary || 0;
    earnings += salary;

    return {
      todayAssigned: todayAssignedCount,
      todayCompleted: todayCompletedCount,
      weeklyCompleted: weeklyCompletedCount,
      weeklyFailed: weeklyFailedCount,
      deliveryRate: Number(deliveryRate.toFixed(2)),
      earnings,
    };
  }

  async getMediaBuyerDashboard(agentId: string) {
    const mbId = new Types.ObjectId(agentId);

    const logs = await this.spendLogModel.find({ mediaBuyerId: mbId }).exec();
    const totalSpent = logs.reduce((sum, log) => sum + log.amountSpent, 0);
    const totalReceived = logs.reduce((sum, log) => sum + log.amountReceived, 0);
    const balance = totalReceived - totalSpent;

    const generatedOrders = await this.orderModel.find({ sourceMediaBuyerId: mbId }).select('_id status').exec();
    const leadsGenerated = generatedOrders.length;
    const orderIdArray = generatedOrders.map(o => o._id);

    const scheduledOrders = await this.orderModel.countDocuments({
      _id: { $in: orderIdArray },
      status: { $ne: OrderStatus.ABANDONED }
    });

    const deliveredOrders = await this.orderModel.countDocuments({
      _id: { $in: orderIdArray },
      status: { $in: [OrderStatus.DELIVERED, OrderStatus.CASH_REMITTED] }
    });

    const deliveryRate = scheduledOrders > 0 ? (deliveredOrders / scheduledOrders) * 100 : 0;
    const cpa = deliveredOrders > 0 ? totalSpent / deliveredOrders : 0;

    const wallet = await this.walletModel.findOne({ userId: mbId });
    let earnings = 0;
    if (wallet) {
      const commissionTransactions = await this.transactionModel.find({
        walletId: wallet._id,
        type: TransactionType.CREDIT,
        category: TransactionCategory.COMMISSION
      }).exec();
      earnings = commissionTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    }

    const userDoc = await this.userModel.findById(mbId);
    const salary = userDoc?.salary || 0;
    earnings += salary;

    return {
      totalSpent,
      totalReceived,
      balance,
      leadsGenerated,
      scheduledOrders,
      deliveredOrders,
      deliveryRate: Number(deliveryRate.toFixed(2)),
      cpa: Number(cpa.toFixed(2)),
      earnings
    };
  }

  async getCsManagerDashboard() {
    const csAgents = await this.userModel.find({ role: Role.CUSTOMER_SERVICE }).exec();
    const team: any[] = [];
    for (const agent of csAgents) {
      const perf = await this.getCsDashboard(agent._id.toString());
      team.push({
        userId: agent._id,
        fullName: agent.fullName,
        email: agent.email,
        team: agent.team,
        isOnline: agent.isOnline,
        isActive: agent.isActive,
        ...perf
      });
    }
    return {
      role: Role.CUSTOMER_SERVICE_MANAGER,
      team
    };
  }

  async getLogisticsManagerDashboard() {
    const logisticsAgents = await this.userModel.find({ role: Role.LOGISTICS }).exec();
    const team: any[] = [];
    for (const agent of logisticsAgents) {
      const perf = await this.getLogisticsDashboard(agent._id.toString());
      team.push({
        userId: agent._id,
        fullName: agent.fullName,
        email: agent.email,
        team: agent.team,
        isOnline: agent.isOnline,
        isActive: agent.isActive,
        ...perf
      });
    }
    return {
      role: Role.LOGISTICS_MANAGER,
      team
    };
  }

  async getMarketingManagerDashboard() {
    const mediaBuyers = await this.userModel.find({ role: Role.MEDIA_BUYER }).exec();
    const team: any[] = [];
    for (const buyer of mediaBuyers) {
      const perf = await this.getMediaBuyerDashboard(buyer._id.toString());
      team.push({
        userId: buyer._id,
        fullName: buyer.fullName,
        email: buyer.email,
        team: buyer.team,
        isOnline: buyer.isOnline,
        isActive: buyer.isActive,
        ...perf
      });
    }
    return {
      role: Role.MARKETING_MANAGER,
      team
    };
  }

  async getUserDashboard(user: any) {
    const role = user.role;
    const userId = user._id.toString();

    switch (role) {
      case Role.CUSTOMER_SERVICE:
        return {
          role,
          performance: await this.getCsDashboard(userId)
        };
      case Role.MEDIA_BUYER:
        return {
          role,
          performance: await this.getMediaBuyerDashboard(userId)
        };
      case Role.LOGISTICS:
        return {
          role,
          performance: await this.getLogisticsDashboard(userId)
        };
      case Role.CUSTOMER_SERVICE_MANAGER:
        return this.getCsManagerDashboard();
      case Role.LOGISTICS_MANAGER:
        return this.getLogisticsManagerDashboard();
      case Role.MARKETING_MANAGER:
        return this.getMarketingManagerDashboard();
      case Role.ADMIN:
      case Role.MANAGER:
        const managementMetrics = await this.getManagementDashboard();
        const csTeam = await this.getCsManagerDashboard();
        const logisticsTeam = await this.getLogisticsManagerDashboard();
        const marketingTeam = await this.getMarketingManagerDashboard();

        const onlineUsers = await this.userModel.find({ isOnline: true }).populate('locationId').exec();
        const onlineUsersData = onlineUsers.map(u => ({
          userId: u._id,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          locationName: (u.locationId as any)?.name || 'Remote / Unassigned',
          team: u.team
        }));

        return {
          role,
          ...managementMetrics,
          onlineUsers: onlineUsersData,
          teams: {
            customerService: csTeam.team,
            logistics: logisticsTeam.team,
            marketing: marketingTeam.team
          }
        };
      default:
        return {
          role,
          ...(await this.getManagementDashboard())
        };
    }
  }
}
