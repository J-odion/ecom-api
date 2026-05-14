import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LeadDocument = HydratedDocument<Lead>;

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  SCHEDULED = 'SCHEDULED', // Becomes an Order
  CANCELLED = 'CANCELLED',
  PARTIAL = 'PARTIAL',     // For progressive capture
}

export enum LeadSource {
  FACEBOOK = 'FACEBOOK',
  GOOGLE = 'GOOGLE',
  TIKTOK = 'TIKTOK',
  INSTAGRAM = 'INSTAGRAM',
  DIRECT = 'DIRECT',
  WHATSAPP = 'WHATSAPP',
  OTHER = 'OTHER',
}

export enum LeadEntryType {
  FORM = 'FORM',
  MANUAL = 'MANUAL',
}

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true, index: true }) // Indexed for fast identity lookup
  customerPhone: string;

  @Prop()
  customerAddress: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedTo: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  sourceMediaBuyerId: Types.ObjectId;

  @Prop({ enum: LeadSource, default: LeadSource.OTHER })
  source: LeadSource;

  @Prop({ enum: LeadEntryType, default: LeadEntryType.FORM })
  entryType: LeadEntryType;

  // --- Identity & Journey Logic ---
  
  @Prop({ default: false })
  isDuplicate: boolean; // Multiple hits for same product without order

  @Prop({ default: false })
  isReturning: boolean; // Has placed an order before

  @Prop({ default: 1 })
  submissionCount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Lead' }] })
  relatedLeadIds: Types.ObjectId[];

  @Prop()
  notes: string;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
