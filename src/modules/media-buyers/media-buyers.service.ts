import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SpendLog, SpendLogDocument } from './schemas/spend-log.schema';
import { CreateSpendLogDto } from './dto/create-spend-log.dto';
import { Lead, LeadDocument } from '../leads/schemas/lead.schema';
import { Order, OrderDocument, OrderStatus } from '../orders/schemas/order.schema';

@Injectable()
export class MediaBuyersService {
  constructor(
    @InjectModel(SpendLog.name) private spendLogModel: Model<SpendLogDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async createSpendLog(createSpendLogDto: CreateSpendLogDto): Promise<SpendLog> {
    const balance = createSpendLogDto.amountReceived - createSpendLogDto.amountSpent;
    
    const spendLog = new this.spendLogModel({
      ...createSpendLogDto,
      mediaBuyerId: new Types.ObjectId(createSpendLogDto.mediaBuyerId),
      date: new Date(createSpendLogDto.date),
      balance,
    });

    return spendLog.save();
  }

  async getPerformanceMetrics(mediaBuyerId: string, range: 'daily' | 'weekly' | 'monthly') {
    const mbId = new Types.ObjectId(mediaBuyerId);
    
    // 1. Get Spend Logs
    const logs = await this.spendLogModel.find({ mediaBuyerId: mbId }).exec();
    const totalSpent = logs.reduce((sum, log) => sum + log.amountSpent, 0);
    const totalReceived = logs.reduce((sum, log) => sum + log.amountReceived, 0);

    // 2. Aggregate Leads
    const leadsCount = await this.leadModel.countDocuments({ sourceMediaBuyerId: mbId });

    // 3. Aggregate Orders originating from these Leads
    // First, find all lead IDs for this media buyer
    const leadIds = await this.leadModel.find({ sourceMediaBuyerId: mbId }).select('_id').exec();
    const leadIdArray = leadIds.map(l => l._id);

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
}
