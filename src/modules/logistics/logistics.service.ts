import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Delivery, DeliveryDocument, DeliveryStatus } from './schemas/delivery.schema';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';

@Injectable()
export class LogisticsService {
  constructor(
    @InjectModel(Delivery.name) private deliveryModel: Model<DeliveryDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  async assignDelivery(dto: AssignDeliveryDto): Promise<Delivery> {
    const delivery = new this.deliveryModel({
      ...dto,
      status: DeliveryStatus.ASSIGNED,
      trackingCode: `TRK-${Math.floor(Math.random() * 1000000)}`,
    });

    const savedDelivery = await delivery.save();
    this.eventEmitter.emit('delivery.assigned', savedDelivery);
    return savedDelivery;
  }

  async updateStatus(id: string, status: DeliveryStatus): Promise<Delivery> {
    const delivery = await this.deliveryModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    // Logic: if delivery is COMPLETED, maybe trigger order.delivered event
    // But since orders.service already does this on its own PATCH, we can keep them separate or link them.
    // Let's emit an event just in case
    if (status === DeliveryStatus.COMPLETED) {
      this.eventEmitter.emit('delivery.completed', delivery);
    }

    return delivery;
  }

  async findAll() {
    return this.deliveryModel.find().exec();
  }
}
