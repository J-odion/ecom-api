import { IsEmail, MinLength, IsEnum, IsString, IsOptional, IsMongoId, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'staff@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ required: false, example: 'securepass' })
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  locationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  commissionRate?: number;

  @ApiProperty({ required: false, example: 'Team Alpha' })
  @IsOptional()
  @IsString()
  team?: string;

  @ApiProperty({ required: false, example: 50000 })
  @IsOptional()
  @IsNumber()
  salary?: number;
}