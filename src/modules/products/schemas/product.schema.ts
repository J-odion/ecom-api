import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  baseCost: number;

  @Prop({ required: true })
  sellingPrice: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true, unique: true })
  sku: string;

  @Prop({ required: true, default: 0 })
  stock: number; // Physical stock in warehouse

  @Prop({ required: true, default: 0 })
  reservedStock: number; // Stock held by pending orders
}

export const ProductSchema = SchemaFactory.createForClass(Product);
