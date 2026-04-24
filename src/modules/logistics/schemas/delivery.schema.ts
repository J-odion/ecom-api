import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DeliveryDocument = HydratedDocument<Delivery>;

export enum DeliveryStatus {
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class Delivery {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  deliveryAgentId: Types.ObjectId;

  @Prop({ enum: DeliveryStatus, default: DeliveryStatus.ASSIGNED })
  status: DeliveryStatus;

  @Prop()
  trackingCode: string;
}

export const DeliverySchema = SchemaFactory.createForClass(Delivery);
