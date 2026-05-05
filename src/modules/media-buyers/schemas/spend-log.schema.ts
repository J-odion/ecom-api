import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SpendLogDocument = HydratedDocument<SpendLog>;

@Schema({ timestamps: true })
export class SpendLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  mediaBuyerId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, default: 0 })
  amountSpent: number;

  @Prop({ required: true, default: 0 })
  amountReceived: number;

  @Prop({ required: true })
  productName: string;

  @Prop()
  balance: number; // calculated as amountReceived - amountSpent
}

export const SpendLogSchema = SchemaFactory.createForClass(SpendLog);
