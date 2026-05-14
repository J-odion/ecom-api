import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LeadDocument = HydratedDocument<Lead>;

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  SCHEDULED = 'SCHEDULED', // Becomes an Order
  CANCELLED = 'CANCELLED',
  PARTIAL = 'PARTIAL',     // Abandoned/Progressive state
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

  @Prop({ required: true, index: true }) // Fast identity lookup
  customerPhone: string;

  @Prop()
  customerAddress: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ enum: LeadStatus, default: LeadStatus.NEW, index: true }) // Fast status filtering for CS
  status: LeadStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  assignedTo: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  sourceMediaBuyerId: Types.ObjectId;

  @Prop({ enum: LeadSource, default: LeadSource.OTHER })
  source: LeadSource;

  @Prop({ enum: LeadEntryType, default: LeadEntryType.FORM })
  entryType: LeadEntryType;

  @Prop({ default: false })
  isDuplicate: boolean;

  @Prop({ default: false })
  isReturning: boolean;

  @Prop({ default: 1 })
  submissionCount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Lead' }] })
  relatedLeadIds: Types.ObjectId[];

  @Prop()
  notes: string;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
