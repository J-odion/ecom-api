import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateCommissionRuleDto {
  @IsString()
  ruleType: string;

  @IsString()
  amountType: string;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsNumber()
  minQuantity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}
