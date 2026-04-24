import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro', description: 'Product Name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'IPH-15-PRO-128', description: 'Stock Keeping Unit' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 1000000, description: 'Price in base currency' })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 50, description: 'Initial stock available' })
  @IsNumber()
  stock: number;
}
