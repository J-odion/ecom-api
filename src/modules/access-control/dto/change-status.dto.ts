import { IsEnum, IsString, IsOptional, ValidateIf, IsDateString } from 'class-validator';
import { UserStatus } from '../enums/user-status.enum';

export class ChangeStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;

  @ValidateIf(o => o.status !== UserStatus.ACTIVE)
  @IsString()
  reason?: string;

  @ValidateIf(o => o.status === UserStatus.ON_LEAVE)
  @IsDateString()
  effectiveUntil?: string;
}
