import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditTrail, AuditTrailDocument } from './schemas/audit-trail.schema';

@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);

  constructor(
    @InjectModel(AuditTrail.name) private auditModel: Model<AuditTrailDocument>,
  ) {}

  async logAction(data: {
    userId?: string | null;
    userEmail?: string;
    action: string;
    details?: Record<string, any>;
    ip?: string;
  }): Promise<AuditTrail | void> {
    try {
      const log = new this.auditModel(data);
      const saved = await log.save();
      this.logger.log(`Audit Trail Log: ${data.action} by ${data.userEmail || 'system'}`);
      return saved;
    } catch (err) {
      this.logger.error(`Failed to save audit trail log: ${err.message}`);
    }
  }

  async getLogs(): Promise<AuditTrail[]> {
    return this.auditModel.find().populate('userId', 'fullName email role').sort({ createdAt: -1 }).exec();
  }

  @OnEvent('order.cash_remitted')
  async handleCashRemitted(order: any) {
    await this.logAction({
      action: 'event.order.cash_remitted',
      details: {
        orderId: order._id,
        totalAmount: order.totalAmount,
        agentId: order.agentId,
      },
    });
  }

  @OnEvent('order.delivered')
  async handleDelivered(order: any) {
    await this.logAction({
      action: 'event.order.delivered',
      details: {
        orderId: order._id,
        totalAmount: order.totalAmount,
      },
    });
  }

  @OnEvent('order.cancelled')
  async handleCancelled(order: any) {
    await this.logAction({
      action: 'event.order.cancelled',
      details: {
        orderId: order._id,
      },
    });
  }
}
