import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';

import { Product, ProductDocument } from '../products/schemas/product.schema';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { StockLevel, StockLevelDocument } from './schemas/stock-level.schema';
import type { OrderDocument } from '../orders/schemas/order.schema';
import { StockInDto } from './dto/stock-in.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(StockLevel.name) private stockLevelModel: Model<StockLevelDocument>,
  ) {}

  async createProduct(dto: CreateProductDto): Promise<Product> {
    const product = new this.productModel(dto);
    return product.save();
  }

  /**
   * Validates and reserves stock at a specific location.
   */
  async validateAndReserveStock(items: { productId: string; qty: number }[], locationId?: string): Promise<boolean> {
    if (!locationId) {
        throw new BadRequestException('Fulfillment location is required for stock reservation');
    }

    const locId = new Types.ObjectId(locationId);

    for (const item of items) {
      const prodId = new Types.ObjectId(item.productId);
      
      // Attempt atomic update on StockLevel
      const result = await this.stockLevelModel.updateOne(
        {
          productId: prodId,
          locationId: locId,
          $expr: {
            $gte: [{ $subtract: ['$stock', '$reservedStock'] }, item.qty],
          },
        },
        { $inc: { reservedStock: item.qty } },
      );

      if (result.modifiedCount === 0) {
        // Either stock level doesn't exist or insufficient stock
        const stockLevel = await this.stockLevelModel.findOne({ productId: prodId, locationId: locId });
        const product = await this.productModel.findById(prodId);
        
        if (!stockLevel) {
          throw new BadRequestException(`No stock record found for product ${product?.name || item.productId} at this location`);
        }
        throw new BadRequestException(`Insufficient stock for product ${product?.name || item.productId} at this location`);
      }
    }

    return true;
  }

  @OnEvent('order.delivered')
  async handleOrderDeliveredEvent(order: OrderDocument) {
    if (!order.fulfillmentLocationId) return;

    for (const item of order.items) {
      await this.stockLevelModel.updateOne(
        { 
          productId: item.productId, 
          locationId: order.fulfillmentLocationId 
        },
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
    if (!order.fulfillmentLocationId) return;

    for (const item of order.items) {
      await this.stockLevelModel.updateOne(
        { 
          productId: item.productId, 
          locationId: order.fulfillmentLocationId 
        },
        { $inc: { reservedStock: -item.qty } }
      );
    }
  }

  async stockIn(dto: StockInDto): Promise<StockLevel> {
    const prodId = new Types.ObjectId(dto.productId);
    const locId = new Types.ObjectId(dto.locationId);

    const stockLevel = await this.stockLevelModel.findOneAndUpdate(
      { productId: prodId, locationId: locId },
      { $inc: { stock: dto.quantity } },
      { upsert: true, new: true }
    );

    return stockLevel;
  }

  async updateStock(productId: string, dto: UpdateStockDto): Promise<StockLevel> {
    const prodId = new Types.ObjectId(productId);
    const locId = new Types.ObjectId(dto.locationId);

    const stockLevel = await this.stockLevelModel.findOneAndUpdate(
      { productId: prodId, locationId: locId },
      { stock: dto.quantity },
      { upsert: true, new: true }
    );

    return stockLevel;
  }

  async transferStock(dto: TransferStockDto): Promise<boolean> {
    const prodId = new Types.ObjectId(dto.productId);
    const fromLocId = new Types.ObjectId(dto.fromLocationId);
    const toLocId = new Types.ObjectId(dto.toLocationId);

    // 1. Check if source has enough stock
    const sourceStock = await this.stockLevelModel.findOne({ productId: prodId, locationId: fromLocId });
    if (!sourceStock || (sourceStock.stock - sourceStock.reservedStock) < dto.quantity) {
      throw new BadRequestException('Insufficient available stock at source location');
    }

    // 2. Perform transfer (Atomic decrement/increment)
    // Note: In a production environment, use Mongoose transactions here.
    await this.stockLevelModel.updateOne(
      { productId: prodId, locationId: fromLocId },
      { $inc: { stock: -dto.quantity } }
    );

    await this.stockLevelModel.findOneAndUpdate(
      { productId: prodId, locationId: toLocId },
      { $inc: { stock: dto.quantity } },
      { upsert: true }
    );

    return true;
  }

  async findAll() {
    return this.productModel.find().exec();
  }

  async getStockLevels(productId: string): Promise<StockLevel[]> {
    return this.stockLevelModel.find({ productId: new Types.ObjectId(productId) }).populate('locationId').exec();
  }
}
