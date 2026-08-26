import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from '../../../common/enums/role.enum';
import { HydratedDocument, Types } from 'mongoose';
import { UserStatus } from '../../access-control/enums/user-status.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ unique: true, required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, enum: Role, default: Role.CUSTOMER_SERVICE })
  legacyRole: Role;

  @Prop({ type: Types.ObjectId, ref: 'Department', default: null })
  department: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Role', default: null })
  role: Types.ObjectId | null;

  @Prop({
    type: [{
      permissionKey: String,
      granted: Boolean,
      setBy: Types.ObjectId,
      setAt: Date,
      reason: String,
    }],
    default: [],
  })
  permissionOverrides: any[];

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ type: Date, default: null })
  tokenValidAfter: Date | null;

  @Prop({ type: Date, default: null })
  statusEffectiveUntil: Date | null;

  @Prop({
    type: [{
      status: String,
      reason: String,
      setBy: Types.ObjectId,
      setAt: Date,
      effectiveUntil: Date,
    }],
    default: [],
  })
  statusHistory: any[];

  @Prop({ type: Types.ObjectId, ref: 'Location' })
  locationId: Types.ObjectId; // The primary office/warehouse assigned to this staff

  @Prop({ default: 10 })
  commissionRate: number;

  @Prop({ index: true })
  team?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ default: 0 })
  salary: number;

  @Prop()
  otp: string;

  @Prop()
  otpExpiresAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);