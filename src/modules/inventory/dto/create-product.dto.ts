import { IsString, IsNumber } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsNumber()
  price: number;

  @IsNumber()
  stock: number;
}
