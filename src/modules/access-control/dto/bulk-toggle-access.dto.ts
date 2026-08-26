import { IsArray, ValidateNested, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ToggleAccessDto } from './toggle-access.dto';

export class BulkToggleAccessDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToggleAccessDto)
  toggles: ToggleAccessDto[];

  @IsString()
  @IsOptional()
  reason?: string;
}
