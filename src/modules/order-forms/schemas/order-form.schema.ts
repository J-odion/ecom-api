import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderFormDocument = HydratedDocument<OrderForm>;

@Schema({ timestamps: true })
export class OrderForm {
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

  // --- New Form Builder Fields ---
  @Prop()
  branch: string;

  @Prop({ type: [String] })
  priorityStates: string[];

  @Prop()
  headline: string;

  @Prop()
  subHeadline: string;

  @Prop()
  preSubmitText: string;

  @Prop()
  postSubmitText: string;

  @Prop()
  footerText: string;

  @Prop()
  thankYouUrl: string;

  @Prop({ type: [Object] })
  customFields: any[];

  @Prop({ default: false })
  showPhoneCode: boolean;

  @Prop({ default: false })
  showWhatsappCode: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Product' })
  bumpProduct: Types.ObjectId;

  @Prop()
  bumpHeader: string;

  @Prop()
  bumpBenefit: string;

  @Prop()
  bumpScarcity: string;

  @Prop()
  bumpCheckbox: string;

  @Prop()
  bumpBg: string;

  @Prop()
  bumpTextCol: string;

  @Prop({ type: Types.ObjectId, ref: 'Product' })
  upsellProduct: Types.ObjectId;

  @Prop()
  upsellUrl: string;

  @Prop()
  upsellBtnText: string;

  @Prop()
  upsellDecline: string;

  @Prop()
  upsellScarcity: string;

  @Prop()
  commitmentFee: number;

  @Prop()
  invoiceFooter: string;

  @Prop()
  receiptFooter: string;

  @Prop({ type: [String] })
  notifyEmails: string[];
}

export const OrderFormSchema = SchemaFactory.createForClass(OrderForm);
