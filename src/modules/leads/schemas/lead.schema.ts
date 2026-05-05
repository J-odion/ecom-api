import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LeadDocument = HydratedDocument<Lead>;

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  SCHEDULED = 'SCHEDULED', // Becomes an Order
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  customerPhone: string;

  @Prop()
  customerAddress: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedTo: Types.ObjectId; // The CS Agent
  
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  sourceMediaBuyerId: Types.ObjectId; // The media buyer whose ad brought this in
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
