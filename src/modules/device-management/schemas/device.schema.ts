import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeviceDocument = Device & Document;

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  LOST = 'LOST',
  LOCKED = 'LOCKED',
  WIPED = 'WIPED',
  NON_COMPLIANT = 'NON_COMPLIANT',
  PENDING_ENROLLMENT = 'PENDING_ENROLLMENT',
}

@Schema({ timestamps: true })
export class Device {
  @Prop({ required: false, type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId;

  @Prop({ required: false })
  fleetHostId?: string;

  @Prop({ required: true, unique: true })
  serialNumber: string;

  @Prop({ required: false })
  uuid?: string;

  @Prop({ required: false })
  assetTag?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: false })
  manufacturer?: string;

  @Prop({ required: false })
  model?: string;

  @Prop({ required: false })
  os?: string;

  @Prop({ required: false })
  osVersion?: string;

  @Prop({ required: true, enum: DeviceStatus, default: DeviceStatus.PENDING_ENROLLMENT })
  status: DeviceStatus;

  @Prop({ required: false })
  enrollmentStatus?: string;

  @Prop({ required: false })
  lastSeenAt?: Date;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
