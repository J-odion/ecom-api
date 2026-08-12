import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeviceAssignmentDocument = DeviceAssignment & Document;

export enum AssignmentStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  PENDING = 'PENDING',
  REVOKED = 'REVOKED',
}

@Schema({ timestamps: true })
export class DeviceAssignment {
  @Prop({ required: false, type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Device' })
  deviceId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  assignedAt: Date;

  @Prop({ required: false })
  unassignedAt?: Date;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  assignedBy?: Types.ObjectId;

  @Prop({ required: false })
  reason?: string;

  @Prop({ required: true, enum: AssignmentStatus, default: AssignmentStatus.ACTIVE })
  status: AssignmentStatus;
}

export const DeviceAssignmentSchema = SchemaFactory.createForClass(DeviceAssignment);
