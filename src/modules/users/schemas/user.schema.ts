import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from '../../../common/enums/role.enum';
import { HydratedDocument, Types } from 'mongoose';

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
  role: Role;

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

  @Prop()
  otp: string;

  @Prop()
  otpExpiresAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);