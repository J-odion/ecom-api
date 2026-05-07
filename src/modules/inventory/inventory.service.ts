import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';

import { Product, ProductDocument } from '../products/schemas/product.schema';
import { CreateProductDto } from '../products/dto/create-product.dto';
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
    for (const item of items) {
      const result = await this.productModel.updateOne(
        {
          _id: item.productId,
          $expr: {
            $gte: [{ $subtract: ['$stock', '$reservedStock'] }, item.qty],
          },
        },
        { $inc: { reservedStock: item.qty } },
      );

      if (result.modifiedCount === 0) {
        // Either product doesn't exist or insufficient stock
        const product = await this.productModel.findById(item.productId);
        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }
        throw new BadRequestException(`Insufficient stock for product ${product.name}`);
      }
    }

    return true;
  }

  @OnEvent('order.scheduled')
  async handleOrderScheduledEvent(order: OrderDocument) {
    // When order is scheduled, reserve the stock
    for (const item of order.items) {
      await this.productModel.findByIdAndUpdate(
        item.productId,
        { $inc: { reservedStock: item.qty } }
      );
    }
  }

  @OnEvent('order.delivered')
  async handleOrderDeliveredEvent(order: OrderDocument) {
    // When order is delivered, permanently deduct stock and release reserved stock
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

  @OnEvent('order.cancelled')
  async handleOrderCancelledEvent(order: OrderDocument) {
    // When order is cancelled before delivery or failed, release reserved stock
    for (const item of order.items) {
      await this.productModel.findByIdAndUpdate(
        item.productId,
        { $inc: { reservedStock: -item.qty } }
      );
    }
  }

  async findAll() {
    return this.productModel.find().exec();
  }
}
