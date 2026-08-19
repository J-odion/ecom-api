import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AccountingPeriodDocument = AccountingPeriod & Document;

@Schema({ timestamps: true })
export class AccountingPeriod {
  @Prop({ required: true, unique: true })
  name: string; // e.g., "August 2026"

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true, enum: ['OPEN', 'CLOSED'], default: 'OPEN' })
  status: string;
}

export const AccountingPeriodSchema = SchemaFactory.createForClass(AccountingPeriod);
