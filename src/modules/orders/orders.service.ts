import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private eventEmitter: EventEmitter2,
    private inventoryService: InventoryService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
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
    return savedOrder;
  }

  async updateDeliveryStatus(id: string, status: OrderStatus, deliveryFee?: number): Promise<Order> {
    const updatePayload: any = { status };
    if (deliveryFee !== undefined) {
      updatePayload.deliveryFee = deliveryFee;
    }

    const order = await this.orderModel.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true },
    );

    if (!order) throw new NotFoundException(`Order with ID ${id} not found`);

    if (status === OrderStatus.DELIVERED) {
      this.eventEmitter.emit('order.delivered', order);
    } else if (status === OrderStatus.FAILED) {
      // We don't automatically restock on FAILED. CS must follow up. 
    }

    return order;
  }

  async updatePaymentStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!order) throw new NotFoundException(`Order with ID ${id} not found`);

    if (status === OrderStatus.CASH_REMITTED) {
      this.eventEmitter.emit('order.cash_remitted', order);
    }

    return order;
  }
  
  async cancelOrder(id: string): Promise<Order> {
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { status: OrderStatus.CANCELLED },
      { new: true },
    );

    if (!order) throw new NotFoundException(`Order with ID ${id} not found`);

    // Emit event to restock
    this.eventEmitter.emit('order.cancelled', order);
    return order;
  }

  async findAll(logisticsId?: string): Promise<Order[]> {
    const filter = logisticsId ? { logisticsId: new Types.ObjectId(logisticsId) } : {};
    return this.orderModel.find(filter).exec();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException(`Order with ID ${id} not found`);
    return order;
  }
}
