import { IsString, IsNumber, IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateOfferDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
