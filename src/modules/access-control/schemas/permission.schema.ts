import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema({ timestamps: true })
export class Permission {
  @Prop({ required: true, unique: true, index: true })
  key: string;

  @Prop({ required: true })
  module: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: false })
  isSensitive: boolean;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
