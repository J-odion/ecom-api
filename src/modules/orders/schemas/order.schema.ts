import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  PENDING = 'PENDING',
  ABANDONED = 'ABANDONED',
  SCHEDULED = 'SCHEDULED',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CASH_REMITTED = 'CASH_REMITTED',
  DISCREPANCY = 'DISCREPANCY',
  CANCELLED = 'CANCELLED',
  DELETED = 'DELETED',
  BANNED = 'BANNED'
}

export enum OrderSource {
  FACEBOOK = 'FACEBOOK',
  GOOGLE = 'GOOGLE',
  TIKTOK = 'TIKTOK',
  INSTAGRAM = 'INSTAGRAM',
  DIRECT = 'DIRECT',
  WHATSAPP = 'WHATSAPP',
  OTHER = 'OTHER',
}

export enum OrderEntryType {
  FORM = 'FORM',
  MANUAL = 'MANUAL',
}

export enum DeliveryType {
  IN_HOUSE = 'IN_HOUSE',
  THIRD_PARTY = 'THIRD_PARTY'
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  qty: number;

  @Prop({ required: true })
  unitPrice: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true, index: true }) // Fast lookup for Returning Customer identity
  customerPhone: string;

  @Prop()
  whatsappNumber: string;

  @Prop()
  callNumber: string;

  @Prop()
  customerEmail: string;

  @Prop()
  customerAddress: string;

  @Prop({ index: true })
  customerState: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  agentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  logisticsId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ enum: OrderStatus, default: OrderStatus.PENDING, index: true })
  status: OrderStatus;

  @Prop({ enum: DeliveryType, default: DeliveryType.IN_HOUSE })
  deliveryType: DeliveryType;

  @Prop({ default: 0 })
  deliveryFee: number;
  
  @Prop({ type: Types.ObjectId, ref: 'OrderForm', default: null, index: true })
  orderFormId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  sourceMediaBuyerId: Types.ObjectId;

  @Prop({ enum: OrderSource, default: OrderSource.OTHER })
  source: OrderSource;

  @Prop({ enum: OrderEntryType, default: OrderEntryType.FORM })
  entryType: OrderEntryType;

  @Prop({ default: false })
  isDuplicate: boolean;

  @Prop({ default: false })
  isReturning: boolean;

  @Prop({ default: 1 })
  submissionCount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Order' }] })
  relatedOrderIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Location' })
  fulfillmentLocationId: Types.ObjectId;

  @Prop()
  notes: string;

  @Prop({ type: Date })
  deliveryDate?: Date;

  @Prop({ type: Date, index: true })
  followUpDate?: Date;

  // ─── Activity Timeline Tracking ──────────────────────────────────────────

  /** The first staff member who opened this order detail */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  firstViewedBy?: Types.ObjectId;

  @Prop({ type: Date })
  firstViewedAt?: Date;

  /** The first agent this order was assigned to */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  firstAssignedTo?: Types.ObjectId;

  @Prop({ type: Date })
  firstAssignedAt?: Date;

  /** The last person to view this order */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  lastViewedBy?: Types.ObjectId;

  /** Total number of times this order has been opened by any staff member */
  @Prop({ default: 0 })
  totalViews: number;

  /** Timestamp of the last activity (any kind) on this order */
  @Prop({ type: Date })
  lastActivityAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
