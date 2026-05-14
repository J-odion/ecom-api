import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Delivery, DeliveryDocument, DeliveryStatus } from './schemas/delivery.schema';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);

  constructor(
    @InjectModel(Delivery.name) private deliveryModel: Model<DeliveryDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async assignDelivery(dto: AssignDeliveryDto): Promise<Delivery> {
    this.logger.log(`Assigning Order ${dto.orderId} to Agent ${dto.deliveryAgentId}`);
    
    try {
      const delivery = new this.deliveryModel({
        orderId: new Types.ObjectId(dto.orderId),
        deliveryAgentId: new Types.ObjectId(dto.deliveryAgentId),
        status: DeliveryStatus.ASSIGNED,
      });

      const savedDelivery = await delivery.save();
      
      // Update order with logistics ID
      await this.orderModel.findByIdAndUpdate(dto.orderId, {
        logisticsId: new Types.ObjectId(dto.deliveryAgentId),
      });

      this.logger.log(`Delivery ${savedDelivery._id} assigned successfully.`);
      return savedDelivery;
    } catch (error) {
      this.logger.error(`Failed to assign delivery for Order ${dto.orderId}: ${error.message}`);
      throw new BadRequestException('We could not assign the delivery. Please check the order and agent IDs.');
    }
  }

  async updateStatus(id: string, status: DeliveryStatus): Promise<Delivery> {
    this.logger.log(`Updating Delivery ${id} status to ${status}`);
    const delivery = await this.deliveryModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!delivery) {
      this.logger.warn(`Update failed: Delivery ${id} not found.`);
      throw new NotFoundException('The delivery record could not be found.');
    }

    this.logger.log(`Delivery ${id} is now ${status}.`);
    return delivery;
  }

  async findAll(): Promise<Delivery[]> {
    return this.deliveryModel.find().populate('orderId').populate('deliveryAgentId').exec();
  }
}
