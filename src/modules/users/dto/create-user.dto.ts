import { IsEmail, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'agent@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securepass', description: 'Password (min 6 chars)' })
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role, description: 'Role of the user' })
  @IsEnum(Role)
  role: Role;
}