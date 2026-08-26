import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({ timestamps: true })
export class Role {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Department', default: null })
  department: Types.ObjectId | null;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: false })
  isSystemRole: boolean;

  @Prop({ default: 0 })
  version: number;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

// Compound index to ensure role names are unique within a department
RoleSchema.index({ name: 1, department: 1 }, { unique: true });
