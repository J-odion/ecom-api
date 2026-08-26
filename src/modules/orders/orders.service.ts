import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { InventoryService } from '../inventory/inventory.service';
import { OrderActivityService } from './order-activity.service';
import { ActivityAction, ActivityCategory, ActivitySource } from './schemas/order-activity.schema';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private eventEmitter: EventEmitter2,
    private inventoryService: InventoryService,
    private readonly activityService: OrderActivityService,
  ) {}

  async create(createOrderDto: CreateOrderDto, actor?: { id: string; name: string }): Promise<Order> {
    this.logger.log(`Attempting to schedule new order for customer: ${createOrderDto.customerName}`);

    try {
      await this.inventoryService.validateAndReserveStock(
        createOrderDto.items,
        createOrderDto.fulfillmentLocationId,
      );

      const now = new Date();
      const order = new this.orderModel({
        ...createOrderDto,
        status: OrderStatus.SCHEDULED,
        agentId: createOrderDto.agentId ? new Types.ObjectId(createOrderDto.agentId) : null,
        logisticsId: createOrderDto.logisticsId ? new Types.ObjectId(createOrderDto.logisticsId) : null,
        leadId: createOrderDto.leadId ? new Types.ObjectId(createOrderDto.leadId) : null,
        fulfillmentLocationId: createOrderDto.fulfillmentLocationId
          ? new Types.ObjectId(createOrderDto.fulfillmentLocationId)
          : null,
        lastActivityAt: now,
      });

      // If an agent is assigned on creation, record first-assignment
      if (createOrderDto.agentId) {
        order.firstAssignedTo = new Types.ObjectId(createOrderDto.agentId);
        order.firstAssignedAt = now;
      }

      const savedOrder = await order.save();
      this.logger.log(`Order ${savedOrder._id} scheduled successfully.`);

      const actorName = actor?.name || 'System';
      await this.activityService.log({
        orderId: savedOrder._id.toString(),
        actorId: actor?.id || null,
        actorName,
        category: ActivityCategory.CREATED,
        action: ActivityAction.ORDER_CREATED,
        description: actor
          ? `${actorName} created this order manually for ${createOrderDto.customerName}`
          : `Order created for ${createOrderDto.customerName}`,
        newValue: OrderStatus.SCHEDULED,
        source: ActivitySource.MANUAL,
      });

      // Log initial assignment if present
      if (createOrderDto.agentId && actor) {
        await this.activityService.log({
          orderId: savedOrder._id.toString(),
          actorId: actor.id,
          actorName,
          category: ActivityCategory.ASSIGNMENT,
          action: ActivityAction.ORDER_ASSIGNED,
          description: `${actorName} assigned this order to agent`,
          metadata: { agentId: createOrderDto.agentId },
          source: ActivitySource.MANUAL,
        });
      }

      return savedOrder;
    } catch (error) {
      this.logger.error(`Order scheduling failed: ${error.message}`);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'We could not schedule the order. Please verify the customer details and stock availability.',
      );
    }
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

  async findOne(id: string, actor?: { id: string; name: string }): Promise<Order> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found.');

    if (actor) {
      const now = new Date();
      const updateFields: any = {
        lastViewedBy: new Types.ObjectId(actor.id),
        lastActivityAt: now,
        $inc: { totalViews: 1 },
      };

      // Record first-ever view
      if (!order.firstViewedBy) {
        updateFields.firstViewedBy = new Types.ObjectId(actor.id);
        updateFields.firstViewedAt = now;
      }

      await this.orderModel.findByIdAndUpdate(id, updateFields).exec();

      await this.activityService.log({
        orderId: id,
        actorId: actor.id,
        actorName: actor.name,
        category: ActivityCategory.VIEW,
        action: ActivityAction.ORDER_VIEWED,
        description: order.firstViewedBy
          ? `${actor.name} viewed this order`
          : `${actor.name} viewed this order for the first time`,
        source: ActivitySource.MANUAL,
      });
    }

    return order;
  }

  async updateDeliveryStatus(
    id: string,
    status: OrderStatus,
    deliveryFee?: number,
    actor?: { id: string; name: string },
  ): Promise<Order> {
    this.logger.log(`Updating delivery status for Order ${id} to ${status}`);

    const existingOrder = await this.orderModel.findById(id).select('status').exec();
    if (!existingOrder) throw new NotFoundException('The order you are trying to update could not be found.');
    const previousStatus = existingOrder.status;

    const updatePayload: any = { status, lastActivityAt: new Date() };
    if (deliveryFee !== undefined) updatePayload.deliveryFee = deliveryFee;
    if (status === OrderStatus.DELIVERED) updatePayload.deliveryDate = new Date();

    const order = await this.orderModel.findByIdAndUpdate(id, updatePayload, { new: true });
    if (!order) throw new NotFoundException('The order you are trying to update could not be found.');

    const actorName = actor?.name || 'System';
    const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ');

    await this.activityService.log({
      orderId: id,
      actorId: actor?.id || null,
      actorName,
      category: ActivityCategory.STATUS,
      action: ActivityAction.DELIVERY_STATUS_CHANGED,
      description: `${actorName} changed delivery status from ${statusLabel(previousStatus)} to ${statusLabel(status)}`,
      previousValue: previousStatus,
      newValue: status,
      metadata: deliveryFee !== undefined ? { deliveryFee } : undefined,
      source: ActivitySource.MANUAL,
    });

    if (status === OrderStatus.DELIVERED) {
      this.logger.log(`Order ${id} marked as DELIVERED. Notifying inventory system.`);
      this.eventEmitter.emit('order.delivered', order);

      await this.activityService.log({
        orderId: id,
        actorId: null,
        actorName: 'System',
        category: ActivityCategory.SYSTEM,
        action: ActivityAction.ORDER_DELIVERED,
        description: 'System: Inventory stock deducted — order fulfilled',
        source: ActivitySource.SYSTEM,
      });
    }

    return order;
  }

  async updatePaymentStatus(
    id: string,
    status: OrderStatus,
    actor?: { id: string; name: string },
  ): Promise<Order> {
    this.logger.log(`Updating payment status for Order ${id} to ${status}`);

    const existingOrder = await this.orderModel.findById(id).select('status').exec();
    if (!existingOrder) throw new NotFoundException('Could not update payment because the order was not found.');
    const previousStatus = existingOrder.status;

    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { status, lastActivityAt: new Date() },
      { new: true },
    );
    if (!order) throw new NotFoundException('Could not update payment because the order was not found.');

    const actorName = actor?.name || 'System';
    await this.activityService.log({
      orderId: id,
      actorId: actor?.id || null,
      actorName,
      category: ActivityCategory.PAYMENT,
      action: ActivityAction.PAYMENT_CONFIRMED,
      description: `${actorName} confirmed payment — status changed from ${previousStatus} to ${status}`,
      previousValue: previousStatus,
      newValue: status,
      source: ActivitySource.MANUAL,
    });

    if (status === OrderStatus.CASH_REMITTED) {
      this.logger.log(`Order ${id} CASH_REMITTED. Recording financial transactions.`);
      this.eventEmitter.emit('order.cash_remitted', order);

      await this.activityService.log({
        orderId: id,
        actorId: null,
        actorName: 'System',
        category: ActivityCategory.SYSTEM,
        action: ActivityAction.CASH_REMITTED,
        description: 'System: Commission calculated and credited to agent wallet',
        source: ActivitySource.SYSTEM,
      });
    }

    return order;
  }

  async cancelOrder(id: string, actor?: { id: string; name: string }): Promise<Order> {
    this.logger.log(`Cancelling Order ${id}`);

    const existingOrder = await this.orderModel.findById(id).select('status').exec();
    if (!existingOrder) throw new NotFoundException('Could not cancel the order because it was not found.');
    const previousStatus = existingOrder.status;

    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { status: OrderStatus.CANCELLED, lastActivityAt: new Date() },
      { new: true },
    );
    if (!order) throw new NotFoundException('Could not cancel the order because it was not found.');

    const actorName = actor?.name || 'System';
    await this.activityService.log({
      orderId: id,
      actorId: actor?.id || null,
      actorName,
      category: ActivityCategory.STATUS,
      action: ActivityAction.ORDER_CANCELLED,
      description: `${actorName} cancelled this order — marked as returned to sender`,
      previousValue: previousStatus,
      newValue: OrderStatus.CANCELLED,
      source: ActivitySource.MANUAL,
    });

    this.logger.log(`Order ${id} cancelled. Restoring stock.`);
    this.eventEmitter.emit('order.cancelled', order);
    return order;
  }

  async updateFollowUp(
    id: string,
    followUpDate: Date,
    notes?: string,
    actor?: { id: string; name: string },
  ): Promise<Order> {
    this.logger.log(`Updating follow-up date for Order ${id} to ${followUpDate}`);
    const updatePayload: any = { followUpDate, lastActivityAt: new Date() };
    if (notes !== undefined) updatePayload.notes = notes;

    const order = await this.orderModel.findByIdAndUpdate(id, updatePayload, { new: true }).exec();
    if (!order) throw new NotFoundException('Order not found');

    const actorName = actor?.name || 'System';
    const dateStr = followUpDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    await this.activityService.log({
      orderId: id,
      actorId: actor?.id || null,
      actorName,
      category: ActivityCategory.FOLLOW_UP,
      action: ActivityAction.FOLLOW_UP_SCHEDULED,
      description: `${actorName} scheduled a follow-up for ${dateStr}`,
      newValue: followUpDate.toISOString(),
      metadata: notes ? { notes } : undefined,
      source: ActivitySource.MANUAL,
    });

    return order;
  }

  async getActivity(orderId: string) {
    const order = await this.orderModel
      .findById(orderId)
      .select('firstViewedBy firstViewedAt firstAssignedTo firstAssignedAt lastViewedBy totalViews lastActivityAt createdAt')
      .populate('firstViewedBy', 'fullName email role')
      .populate('firstAssignedTo', 'fullName email role')
      .populate('lastViewedBy', 'fullName email role')
      .lean()
      .exec();

    if (!order) throw new NotFoundException('Order not found.');

    const activities = await this.activityService.getActivitiesForOrder(orderId);

    return {
      orderId,
      ownership: {
        firstViewedBy: order.firstViewedBy,
        firstViewedAt: order.firstViewedAt,
        firstAssignedTo: order.firstAssignedTo,
        firstAssignedAt: order.firstAssignedAt,
        lastViewedBy: order.lastViewedBy,
        totalViews: order.totalViews,
        lastActivityAt: order.lastActivityAt,
        orderCreatedAt: (order as any).createdAt,
      },
      activities,
    };
  }
}
