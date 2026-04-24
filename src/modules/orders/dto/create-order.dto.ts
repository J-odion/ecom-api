import { IsString, IsArray, ValidateNested, IsNumber, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca', description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 2, description: 'Quantity' })
  @IsNumber()
  qty: number;

  @ApiProperty({ example: 5000, description: 'Unit price of the product' })
  @IsNumber()
  unitPrice: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca', description: 'Customer ID' })
  @IsMongoId()
  customerId: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109ca', description: 'Agent ID who closed the sale', required: false })
  @IsMongoId()
  agentId: string;

  @ApiProperty({ type: [OrderItemDto], description: 'Items in the order' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ example: 'COD', description: 'Payment Method (e.g. COD, CARD)' })
  @IsString()
  paymentMethod: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 'PACKED', description: 'New status for the order' })
  @IsString()
  status: string;
}
