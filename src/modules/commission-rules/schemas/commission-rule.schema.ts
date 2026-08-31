import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CommissionRuleDocument = HydratedDocument<CommissionRule>;

export enum RuleType {
  GLOBAL = 'GLOBAL',
  PRODUCT = 'PRODUCT',
  QUANTITY = 'QUANTITY',
}

export enum AmountType {
  FLAT = 'FLAT',
  PERCENTAGE = 'PERCENTAGE',
}

@Schema({ timestamps: true })
export class CommissionRule {
  @Prop({ enum: RuleType, required: true })
  ruleType: RuleType;

  @Prop({ enum: AmountType, required: true })
  amountType: AmountType;

  @Prop({ required: true })
  value: number;

  @Prop({ type: Types.ObjectId, ref: 'Product' })
  productId?: Types.ObjectId;

  @Prop()
  minQuantity?: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [String], default: [] })
  roles: string[];
}

export const CommissionRuleSchema = SchemaFactory.createForClass(CommissionRule);
