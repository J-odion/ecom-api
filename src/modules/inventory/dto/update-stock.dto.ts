import { ApiProperty } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty()
  locationId: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty({ required: false })
  notes?: string;
}
