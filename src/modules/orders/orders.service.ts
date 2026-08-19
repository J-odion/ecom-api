import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private eventEmitter: EventEmitter2,
    private inventoryService: InventoryService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    this.logger.log(`Attempting to schedule new order for customer: ${createOrderDto.customerName}`);
    
    try {
      // 1. Validate and reserve stock at the specific location
      await this.inventoryService.validateAndReserveStock(
        createOrderDto.items, 
        createOrderDto.fulfillmentLocationId
      );

      const order = new this.orderModel({
        ...createOrderDto,
        status: OrderStatus.SCHEDULED,
        agentId: createOrderDto.agentId ? new Types.ObjectId(createOrderDto.agentId) : null,
        logisticsId: createOrderDto.logisticsId ? new Types.ObjectId(createOrderDto.logisticsId) : null,
        leadId: createOrderDto.leadId ? new Types.ObjectId(createOrderDto.leadId) : null,
        fulfillmentLocationId: createOrderDto.fulfillmentLocationId ? new Types.ObjectId(createOrderDto.fulfillmentLocationId) : null,
      });

      const savedOrder = await order.save();
      this.logger.log(`Order ${savedOrder._id} scheduled successfully.`);
      return savedOrder;
    } catch (error) {
      this.logger.error(`Order scheduling failed: ${error.message}`);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('We could not schedule the order. Please verify the customer details and stock availability.');
    }
  }

  async updateDeliveryStatus(id: string, status: OrderStatus, deliveryFee?: number): Promise<Order> {
    this.logger.log(`Updating delivery status for Order ${id} to ${status}`);
    const updatePayload: any = { status };
    if (deliveryFee !== undefined) {
      updatePayload.deliveryFee = deliveryFee;
    }
    if (status === OrderStatus.DELIVERED) {
      updatePayload.deliveryDate = new Date();
    }

    const order = await this.orderModel.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true },
    );

    if (!order) {
      this.logger.warn(`Delivery update failed: Order ${id} not found.`);
      throw new NotFoundException('The order you are trying to update could not be found.');
    }

    if (status === OrderStatus.DELIVERED) {
      this.logger.log(`Order ${id} marked as DELIVERED. Notifying inventory system.`);
      this.eventEmitter.emit('order.delivered', order);
    }

    return order;
  }

  async updatePaymentStatus(id: string, status: OrderStatus): Promise<Order> {
    this.logger.log(`Updating payment status for Order ${id} to ${status}`);
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!order) {
      this.logger.warn(`Payment update failed: Order ${id} not found.`);
      throw new NotFoundException('Could not update payment because the order was not found.');
    }

    if (status === OrderStatus.CASH_REMITTED) {
      this.logger.log(`Order ${id} CASH_REMITTED. Recording financial transactions.`);
      this.eventEmitter.emit('order.cash_remitted', order);
    }

    return order;
  }
  
  async cancelOrder(id: string): Promise<Order> {
    this.logger.log(`Cancelling Order ${id}`);
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { status: OrderStatus.CANCELLED },
      { new: true },
    );

    if (!order) {
      this.logger.warn(`Cancellation failed: Order ${id} not found.`);
      throw new NotFoundException('Could not cancel the order because it was not found.');
    }

    this.logger.log(`Order ${id} cancelled. Restoring stock.`);
    this.eventEmitter.emit('order.cancelled', order);
    return order;
  }

  async findAll(logisticsId?: string, startDate?: string, endDate?: string): Promise<Order[]> {
    const filter: any = {};
    if (logisticsId) filter.logisticsId = new Types.ObjectId(logisticsId);
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    return this.orderModel.find(filter).exec();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  async updateFollowUp(id: string, followUpDate: Date, notes?: string): Promise<Order> {
    this.logger.log(`Updating follow-up date for Order ${id} to ${followUpDate}`);
    const updatePayload: any = { followUpDate };
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true },
    ).exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
