import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    // 1. Validate and reserve stock
    await this.inventoryService.validateAndReserveStock(createOrderDto.items);

    const totalAmount = createOrderDto.items.reduce(
      (sum, item) => sum + item.qty * item.unitPrice,
      0,
    );

    const order = new this.orderModel({
      ...createOrderDto,
      totalAmount,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await order.save();
    this.eventEmitter.emit('order.created', savedOrder);
    return savedOrder;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Emit events based on status
    if (status === OrderStatus.PACKED) {
      this.eventEmitter.emit('order.packed', order);
    } else if (status === OrderStatus.DELIVERED) {
      this.eventEmitter.emit('order.delivered', order);
    }

    return order;
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().exec();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }
}
