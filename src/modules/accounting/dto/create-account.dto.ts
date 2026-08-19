import { IsString, IsEnum, IsBoolean, IsOptional, IsMongoId } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsEnum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'COGS', 'EXPENSE'])
  type: string;

  @IsEnum(['DEBIT', 'CREDIT'])
  normalBalance: string;

  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
