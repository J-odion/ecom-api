import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  SCHEDULED = 'SCHEDULED',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CASH_REMITTED = 'CASH_REMITTED',
  DISCREPANCY = 'DISCREPANCY',
  CANCELLED = 'CANCELLED'
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

  @Prop({ required: true })
  customerPhone: string;

  @Prop()
  customerAddress: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  agentId: Types.ObjectId; // CS Agent who scheduled it

  @Prop({ type: Types.ObjectId, ref: 'User' })
  logisticsId: Types.ObjectId; // Rider or Third Party assigned

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ enum: OrderStatus, default: OrderStatus.SCHEDULED })
  status: OrderStatus;

  @Prop({ enum: DeliveryType, default: DeliveryType.IN_HOUSE })
  deliveryType: DeliveryType;

  @Prop({ default: 0 })
  deliveryFee: number;
  
  @Prop({ type: Types.ObjectId, ref: 'Lead' })
  leadId: Types.ObjectId; // The lead this order originated from

  @Prop({ type: Types.ObjectId, ref: 'Location' })
  fulfillmentLocationId: Types.ObjectId; // The office/warehouse fulfilling this order

  @Prop()
  notes: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
