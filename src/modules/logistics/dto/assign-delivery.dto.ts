import { IsMongoId, IsString } from 'class-validator';

export class AssignDeliveryDto {
  @IsMongoId()
  orderId: string;

  @IsMongoId()
  deliveryAgentId: string;
}

export class UpdateDeliveryStatusDto {
  @IsString()
  status: string;
}
