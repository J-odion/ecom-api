import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeviceActionDocument = DeviceAction & Document;

export enum ActionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class DeviceAction {
  @Prop({ required: false, type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Device' })
  deviceId: Types.ObjectId;

  @Prop({ required: true })
  actionType: string;

  @Prop({ required: true, enum: ActionStatus, default: ActionStatus.PENDING })
  status: ActionStatus;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  initiatedBy: Types.ObjectId;

  @Prop({ required: false })
  reason?: string;

  @Prop({ required: false })
  executedAt?: Date;

  @Prop({ required: false, type: Object })
  responseDetails?: any;
}

export const DeviceActionSchema = SchemaFactory.createForClass(DeviceAction);
