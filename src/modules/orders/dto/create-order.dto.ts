import { IsString, IsArray, ValidateNested, IsNumber, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  qty: number;

  @IsNumber()
  unitPrice: number;
}

export class CreateOrderDto {
  @IsMongoId()
  customerId: string;

  @IsMongoId()
  agentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  paymentMethod: string;
}

export class UpdateOrderStatusDto {
  @IsString()
  status: string;
}
