import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AccountDocument = Account & Document;

@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'COGS', 'EXPENSE'] })
  type: string;

  @Prop({ required: true, enum: ['DEBIT', 'CREDIT'] })
  normalBalance: string;

  @Prop({ type: Types.ObjectId, ref: 'Account' })
  parentId?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
