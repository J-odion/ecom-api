import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuditTrailDocument = HydratedDocument<AuditTrail>;

@Schema({ timestamps: true })
export class AuditTrail {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  userId?: Types.ObjectId;

  @Prop({ default: 'anonymous', index: true })
  userEmail?: string;

  @Prop({ required: true, index: true })
  action: string; // e.g. "POST /orders", "event.order.cash_remitted"

  @Prop({ type: Object })
  details?: Record<string, any>;

  @Prop()
  ip?: string;
}

export const AuditTrailSchema = SchemaFactory.createForClass(AuditTrail);
