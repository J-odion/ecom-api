import { IsEmail, MinLength, IsEnum } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsEnum(Role)
  role: Role;
}