import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DepartmentDocument = HydratedDocument<Department>;

@Schema({ timestamps: true })
export class Department {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  defaultPermissions: string[];

  @Prop({ default: 0 })
  version: number;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
