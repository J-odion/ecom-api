import { IsEmail, MinLength, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'newuser@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'customer_service', enum: Role, required: false })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
