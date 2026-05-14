import { ApiProperty } from '@nestjs/swagger';

export class TransferStockDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  fromLocationId: string;

  @ApiProperty()
  toLocationId: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty({ required: false })
  notes?: string;
}
