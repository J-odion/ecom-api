import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  OrderActivity,
  OrderActivityDocument,
  ActivityCategory,
  ActivityAction,
  ActivitySource,
} from './schemas/order-activity.schema';

export interface LogActivityDto {
  orderId: string | Types.ObjectId;
  actorId?: string | Types.ObjectId | null;
  actorName?: string;
  category: ActivityCategory;
  action: ActivityAction;
  description: string;
  previousValue?: string;
  newValue?: string;
  metadata?: Record<string, any>;
  source?: ActivitySource;
}

@Injectable()
export class OrderActivityService {
  private readonly logger = new Logger(OrderActivityService.name);

  constructor(
    @InjectModel(OrderActivity.name)
    private activityModel: Model<OrderActivityDocument>,
  ) {}

  async log(dto: LogActivityDto): Promise<OrderActivity | undefined> {
    try {
      const activity = new this.activityModel({
        orderId: new Types.ObjectId(dto.orderId.toString()),
        actorId: dto.actorId ? new Types.ObjectId(dto.actorId.toString()) : null,
        actorName: dto.actorName || 'System',
        category: dto.category,
        action: dto.action,
        description: dto.description,
        previousValue: dto.previousValue,
        newValue: dto.newValue,
        metadata: dto.metadata,
        source: dto.source || ActivitySource.MANUAL,
      });
      return activity.save();
    } catch (err) {
      // Activity logging must NEVER break the main operation
      this.logger.error(`Failed to log activity for order ${dto.orderId}: ${err.message}`);
    }
  }

  async getActivitiesForOrder(orderId: string): Promise<OrderActivity[]> {
    return this.activityModel
      .find({ orderId: new Types.ObjectId(orderId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
}
