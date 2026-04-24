import { IsMongoId, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignDeliveryDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca', description: 'Order ID to assign' })
  @IsMongoId()
  orderId: string;

  @ApiProperty({ example: '60d0fe4f5311236168a109ca', description: 'Delivery Agent ID' })
  @IsMongoId()
  deliveryAgentId: string;
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({ example: 'COMPLETED', description: 'New status for the delivery' })
  @IsString()
  status: string;
}
