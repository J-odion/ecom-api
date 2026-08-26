import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsMongoId, IsArray, IsNumber } from 'class-validator';

export class CreateOrderFormDto {
  @IsString()
  @IsNotEmpty({ message: 'Form title is required.' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsMongoId({ message: 'A valid product must be selected.' })
  productId: string;

  @IsOptional()
  @IsMongoId()
  sourceMediaBuyerId?: string;

  @IsOptional()
  @IsString()
  defaultSource?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  submitButtonText?: string;

  @IsOptional()
  @IsString()
  successMessage?: string;

  @IsOptional()
  @IsBoolean()
  showQuantityField?: boolean;

  @IsOptional()
  @IsBoolean()
  showAddressField?: boolean;

  // --- New Form Builder Fields ---
  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  priorityStates?: string | string[];

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  subHeadline?: string;

  @IsOptional()
  @IsString()
  preSubmitText?: string;

  @IsOptional()
  @IsString()
  postSubmitText?: string;

  @IsOptional()
  @IsString()
  footerText?: string;

  @IsOptional()
  @IsString()
  thankYouUrl?: string;

  @IsOptional()
  @IsArray()
  customFields?: any[];

  @IsOptional()
  @IsBoolean()
  showPhoneCode?: boolean;

  @IsOptional()
  @IsBoolean()
  showWhatsappCode?: boolean;

  @IsOptional()
  @IsMongoId()
  bumpProduct?: string;

  @IsOptional()
  @IsString()
  bumpHeader?: string;

  @IsOptional()
  @IsString()
  bumpBenefit?: string;

  @IsOptional()
  @IsString()
  bumpScarcity?: string;

  @IsOptional()
  @IsString()
  bumpCheckbox?: string;

  @IsOptional()
  @IsString()
  bumpBg?: string;

  @IsOptional()
  @IsString()
  bumpTextCol?: string;

  @IsOptional()
  @IsMongoId()
  upsellProduct?: string;

  @IsOptional()
  @IsString()
  upsellUrl?: string;

  @IsOptional()
  @IsString()
  upsellBtnText?: string;

  @IsOptional()
  @IsString()
  upsellDecline?: string;

  @IsOptional()
  @IsString()
  upsellScarcity?: string;

  @IsOptional()
  @IsNumber()
  commitmentFee?: number;

  @IsOptional()
  @IsString()
  invoiceFooter?: string;

  @IsOptional()
  @IsString()
  receiptFooter?: string;

  @IsOptional()
  @IsArray()
  notifyEmails?: string[];
}
