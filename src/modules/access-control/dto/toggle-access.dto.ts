import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class ToggleAccessDto {
  @IsString()
  @IsNotEmpty()
  permissionKey: string;

  @IsBoolean()
  granted: boolean;

  @IsString()
  @IsOptional()
  reason?: string;
}
