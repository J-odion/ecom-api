import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from '../../../common/enums/role.enum';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true })
  email: string;

  @Prop()
  password: string;

  @Prop({ enum: Role })
  role: Role;

  @Prop({ default: 10 })
  commissionRate: number;
}

export const UserSchema = SchemaFactory.createForClass(User);