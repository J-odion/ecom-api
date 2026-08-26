import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderActivityDocument = HydratedDocument<OrderActivity>;

export enum ActivityCategory {
  CREATED = 'CREATED',
  VIEW = 'VIEW',
  ASSIGNMENT = 'ASSIGNMENT',
  STATUS = 'STATUS',
  NOTE = 'NOTE',
  FOLLOW_UP = 'FOLLOW_UP',
  COMMUNICATION = 'COMMUNICATION',
  PAYMENT = 'PAYMENT',
  SYSTEM = 'SYSTEM',
}

export enum ActivityAction {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_VIEWED = 'ORDER_VIEWED',
  ORDER_ASSIGNED = 'ORDER_ASSIGNED',
  ORDER_REASSIGNED = 'ORDER_REASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  DELIVERY_STATUS_CHANGED = 'DELIVERY_STATUS_CHANGED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  FOLLOW_UP_SCHEDULED = 'FOLLOW_UP_SCHEDULED',
  NOTE_ADDED = 'NOTE_ADDED',
  FORM_SUBMITTED = 'FORM_SUBMITTED',
  CART_ABANDONED = 'CART_ABANDONED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  CASH_REMITTED = 'CASH_REMITTED',
  ORDER_DELETED = 'ORDER_DELETED',
  SYSTEM_EVENT = 'SYSTEM_EVENT',
}

export enum ActivitySource {
  MANUAL = 'MANUAL',
  SYSTEM = 'SYSTEM',
  WEBHOOK = 'WEBHOOK',
  API = 'API',
}

@Schema({ timestamps: true })
export class OrderActivity {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  orderId: Types.ObjectId;

  /** The user who performed the action. Null means the system did it automatically. */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  actorId?: Types.ObjectId;

  /** Denormalised actor name for fast display without joins */
  @Prop({ default: 'System' })
  actorName: string;

  @Prop({ enum: ActivityCategory, required: true, index: true })
  category: ActivityCategory;

  @Prop({ enum: ActivityAction, required: true, index: true })
  action: ActivityAction;

  /** Plain-English description shown in the UI timeline */
  @Prop({ required: true })
  description: string;

  /** What the value was before the change (e.g. "PENDING") */
  @Prop()
  previousValue?: string;

  /** What the value became after the change (e.g. "SCHEDULED") */
  @Prop()
  newValue?: string;

  /** Extra structured data — e.g. follow-up date, note text */
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ enum: ActivitySource, default: ActivitySource.MANUAL })
  source: ActivitySource;
}

export const OrderActivitySchema = SchemaFactory.createForClass(OrderActivity);
