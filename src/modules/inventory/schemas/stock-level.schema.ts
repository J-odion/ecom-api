import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StockLevelDocument = HydratedDocument<StockLevel>;

@Schema({ timestamps: true })
export class StockLevel {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Location', required: true })
  locationId: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  stock: number;

  @Prop({ required: true, default: 0 })
  reservedStock: number;
}

export const StockLevelSchema = SchemaFactory.createForClass(StockLevel);

// Compound index to ensure uniqueness of product per location
StockLevelSchema.index({ productId: 1, locationId: 1 }, { unique: true });
