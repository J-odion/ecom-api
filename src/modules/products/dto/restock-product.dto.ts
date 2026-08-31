import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RestockProductDto {
  @ApiProperty({ description: 'The quantity to add to the existing stock', example: 50 })
  @IsNumber()
  @Min(1)
  quantityRestocked: number;
}
