import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(StockLevel.name) private stockLevelModel: Model<StockLevelDocument>,
  ) {}

  async createProduct(dto: CreateProductDto): Promise<Product> {
    this.logger.log(`Adding new product to catalog: ${dto.name}`);
    const product = new this.productModel(dto);
    return product.save();
  }

  /**
   * Validates and reserves stock at a specific location.
   */
  async validateAndReserveStock(items: { productId: string; qty: number }[], locationId?: string): Promise<boolean> {
    if (!locationId) {
        this.logger.warn('Stock reservation failed: No fulfillment location provided.');
        throw new BadRequestException('Please select an office or warehouse for this order.');
    }

    this.logger.log(`Attempting to reserve stock for ${items.length} items at location ${locationId}`);
    const locId = new Types.ObjectId(locationId);

    for (const item of items) {
      const prodId = new Types.ObjectId(item.productId);
      
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
        const stockLevel = await this.stockLevelModel.findOne({ productId: prodId, locationId: locId });
        const product = await this.productModel.findById(prodId);
        const productName = product?.name || item.productId;
        
        if (!stockLevel) {
          this.logger.warn(`Stock reservation failed: No stock record for ${productName} at ${locationId}`);
          throw new BadRequestException(`We don't have a record of "${productName}" in the selected office. Please check the inventory.`);
        }

        this.logger.warn(`Stock reservation failed: Insufficient stock for ${productName} at ${locationId}`);
        throw new BadRequestException(`Insufficient stock for "${productName}". We only have ${stockLevel.stock - stockLevel.reservedStock} available at this location.`);
      }
    }

    this.logger.log(`Stock reserved successfully for order at location ${locationId}`);
    return true;
  }

  @OnEvent('order.delivered')
  async handleOrderDeliveredEvent(order: OrderDocument) {
    if (!order.fulfillmentLocationId) {
      this.logger.error(`Stock deduction error: Order ${order._id} delivered but no fulfillmentLocationId found.`);
      return;
    }

    this.logger.log(`Order ${order._id} delivered. Deducting stock from location ${order.fulfillmentLocationId}`);
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
    if (!order.fulfillmentLocationId) {
        this.logger.error(`Stock restoration error: Order ${order._id} cancelled but no fulfillmentLocationId found.`);
        return;
    }

    this.logger.log(`Order ${order._id} cancelled. Releasing reserved stock at location ${order.fulfillmentLocationId}`);
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
    this.logger.log(`Stock-in: Adding ${dto.quantity} units for product ${dto.productId} at location ${dto.locationId}`);
    const prodId = new Types.ObjectId(dto.productId);
    const locId = new Types.ObjectId(dto.locationId);

    return this.stockLevelModel.findOneAndUpdate(
      { productId: prodId, locationId: locId },
      { $inc: { stock: dto.quantity } },
      { upsert: true, new: true }
    );
  }

  async updateStock(productId: string, dto: UpdateStockDto): Promise<StockLevel> {
    this.logger.log(`Manual stock adjustment for product ${productId} at location ${dto.locationId} to ${dto.quantity}`);
    const prodId = new Types.ObjectId(productId);
    const locId = new Types.ObjectId(dto.locationId);

    return this.stockLevelModel.findOneAndUpdate(
      { productId: prodId, locationId: locId },
      { stock: dto.quantity },
      { upsert: true, new: true }
    );
  }

  async transferStock(dto: TransferStockDto): Promise<boolean> {
    this.logger.log(`Initiating stock transfer: ${dto.quantity} units from ${dto.fromLocationId} to ${dto.toLocationId}`);
    const prodId = new Types.ObjectId(dto.productId);
    const fromLocId = new Types.ObjectId(dto.fromLocationId);
    const toLocId = new Types.ObjectId(dto.toLocationId);

    const sourceStock = await this.stockLevelModel.findOne({ productId: prodId, locationId: fromLocId });
    if (!sourceStock || (sourceStock.stock - sourceStock.reservedStock) < dto.quantity) {
      this.logger.warn(`Transfer failed: Insufficient stock at source ${dto.fromLocationId}`);
      throw new BadRequestException('Cannot complete transfer: The source office does not have enough available stock.');
    }

    await this.stockLevelModel.updateOne(
      { productId: prodId, locationId: fromLocId },
      { $inc: { stock: -dto.quantity } }
    );

    await this.stockLevelModel.findOneAndUpdate(
      { productId: prodId, locationId: toLocId },
      { $inc: { stock: dto.quantity } },
      { upsert: true }
    );

    this.logger.log(`Transfer completed successfully.`);
    return true;
  }

  async findAll() {
    const products = await this.productModel.find().lean().exec();
    
    // Fetch all stock levels
    const stockLevels = await this.stockLevelModel.find().lean().exec();
    
    // Group stock by productId
    const stockMap = new Map<string, number>();
    for (const sl of stockLevels) {
      const pid = sl.productId.toString();
      stockMap.set(pid, (stockMap.get(pid) || 0) + sl.stock);
    }
    
    return products.map(p => ({
      ...p,
      stock: stockMap.get(p._id.toString()) || 0,
      cost: p.baseCost,
      price: p.sellingPrice,
    }));
  }

  async getStockLevels(productId: string): Promise<StockLevel[]> {
    return this.stockLevelModel.find({ productId: new Types.ObjectId(productId) }).populate('locationId').exec();
  }
}
