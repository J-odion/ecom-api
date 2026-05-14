import { ApiProperty } from '@nestjs/swagger';

export class StockInDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  locationId: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty({ required: false })
  notes?: string;
}
