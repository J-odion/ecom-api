import { IsEmail, MinLength, IsEnum, IsString, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'staff@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securepass' })
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  locationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  commissionRate?: number;

  @ApiProperty({ required: false, example: 'Team Alpha' })
  @IsOptional()
  @IsString()
  team?: string;
}