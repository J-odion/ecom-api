import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';

import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import type { OrderDocument } from '../orders/schemas/order.schema';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async createProduct(dto: CreateProductDto): Promise<Product> {
    const product = new this.productModel(dto);
    return product.save();
  }

  async validateAndReserveStock(items: { productId: string; qty: number }[]): Promise<boolean> {
    // 1. Validate
    for (const item of items) {
      const product = await this.productModel.findById(item.productId);
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

      const availableStock = product.stock - product.reservedStock;
      if (availableStock < item.qty) {
        throw new BadRequestException(`Insufficient stock for product ${product.name}`);
      }
    }

    // 2. Reserve
    for (const item of items) {
      await this.productModel.findByIdAndUpdate(
        item.productId,
        { $inc: { reservedStock: item.qty } }
      );
    }

    return true;
  }

  @OnEvent('order.packed')
  async handleOrderPackedEvent(order: OrderDocument) {
    // When order is packed, permanently deduct the stock
    for (const item of order.items) {
      await this.productModel.findByIdAndUpdate(
        item.productId,
        { 
          $inc: { 
            stock: -item.qty, 
            reservedStock: -item.qty 
          } 
        }
      );
    }
  }

  async findAll() {
    return this.productModel.find().exec();
  }
}
