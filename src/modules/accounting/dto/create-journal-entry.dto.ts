import { IsString, IsDateString, IsEnum, IsOptional, IsArray, ValidateNested, IsNumber, IsMongoId, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class JournalLineDto {
  @IsMongoId()
  accountId: string;

  @IsOptional()
  @IsNumber()
  debit?: number;

  @IsOptional()
  @IsNumber()
  credit?: number;

  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @IsOptional()
  @IsMongoId()
  locationId?: string;
}

export class CreateJournalEntryDto {
  @IsString()
  journalNumber: string;

  @IsDateString()
  date: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'POSTED', 'VOIDED'])
  status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}
