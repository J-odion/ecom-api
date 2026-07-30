import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsMongoId, Min, Matches } from 'class-validator';
import { LeadSource, LeadEntryType } from '../schemas/lead.schema';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty({ message: 'Customer name is required.' })
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'Customer name must contain letters only.' })
  customerName: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required.' })
  @Matches(/^(\+?[0-9]{7,15})$/, { message: 'Please provide a valid phone number (7–15 digits).' })
  customerPhone: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsMongoId({ message: 'A valid product must be selected.' })
  productId: string;

  @IsNumber({}, { message: 'Quantity must be a number.' })
  @Min(1, { message: 'Quantity must be at least 1.' })
  quantity: number;

  @IsOptional()
  @IsMongoId()
  sourceMediaBuyerId?: string;

  @IsOptional()
  @IsMongoId()
  leadFormId?: string;

  @IsOptional()
  @IsEnum(LeadSource, { message: 'Invalid lead source.' })
  source?: LeadSource;

  @IsOptional()
  @IsEnum(LeadEntryType)
  entryType?: LeadEntryType;

  @IsOptional()
  @IsString()
  notes?: string;
}
