import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SpendLog, SpendLogDocument } from './schemas/spend-log.schema';
import { CreateSpendLogDto } from './dto/create-spend-log.dto';

@Injectable()
export class MediaBuyersService {
  constructor(@InjectModel(SpendLog.name) private spendLogModel: Model<SpendLogDocument>) {}

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
    // In a real application, you'd calculate the date range here based on `range`
    // and aggregate leads, scheduled orders, delivered orders, and ad spend from other modules.
    // For now, this returns a stub or simple aggregation of their spend log.
    const logs = await this.spendLogModel.find({ 
      mediaBuyerId: new Types.ObjectId(mediaBuyerId) 
    }).exec();

    const totalSpent = logs.reduce((sum, log) => sum + log.amountSpent, 0);
    const totalReceived = logs.reduce((sum, log) => sum + log.amountReceived, 0);

    return {
      totalSpent,
      totalReceived,
      balance: totalReceived - totalSpent,
      // The below would normally be fetched by cross-module aggregation
      leadsGenerated: 0,
      scheduledOrders: 0,
      deliveredOrders: 0,
      deliveryRate: 0,
      cpa: 0
    };
  }
}
