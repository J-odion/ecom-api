import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LeadFormDocument = HydratedDocument<LeadForm>;

@Schema({ timestamps: true })
export class LeadForm {
  @Prop({ required: true })
  title: string; // e.g. "Luxury Watch Facebook Campaign"

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  sourceMediaBuyerId: Types.ObjectId; // Pre-fills attribution to a media buyer

  @Prop({ default: 'OTHER' })
  defaultSource: string; // e.g. FACEBOOK, GOOGLE, TIKTOK

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: '#4F46E5' })
  primaryColor: string; // Brand color for the form

  @Prop({ default: 'Submit' })
  submitButtonText: string;

  @Prop()
  successMessage: string;

  @Prop({ default: false })
  showQuantityField: boolean;

  @Prop({ default: true })
  showAddressField: boolean;
}

export const LeadFormSchema = SchemaFactory.createForClass(LeadForm);
