import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsMongoId, IsEnum } from 'class-validator';
import { LeadSource } from '../../leads/schemas/lead.schema';

export class CreateLeadFormDto {
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
  @IsEnum(LeadSource)
  defaultSource?: LeadSource;

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
}
