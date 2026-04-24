import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WalletDocument = HydratedDocument<Wallet>;

export enum WalletType {
  SYSTEM = 'SYSTEM', // for global revenue, expenses
  STAFF = 'STAFF', // for agents
  AFFILIATE = 'AFFILIATE', // for external partners
}

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId; // null if SYSTEM wallet

  @Prop({ enum: WalletType, required: true })
  type: WalletType;

  @Prop({ required: true, default: 0 })
  balance: number; // derived but cached for fast reads
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
