import { Controller, Post, Body, Patch, Param, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './schemas/order.schema';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order (Scheduled)' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  findAll(@Query('logisticsId') logisticsId?: string) {
    return this.ordersService.findAll(logisticsId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/delivery-status')
  @ApiOperation({ summary: 'Update delivery status (Logistics)' })
  updateDeliveryStatus(
    @Param('id') id: string,
    @Body() updateDto: { status: OrderStatus; deliveryFee?: number },
  ) {
    return this.ordersService.updateDeliveryStatus(id, updateDto.status, updateDto.deliveryFee);
  }

  @Patch(':id/payment-status')
  @ApiOperation({ summary: 'Confirm cash remittance (Accountant)' })
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() updateDto: { status: OrderStatus },
  ) {
    return this.ordersService.updatePaymentStatus(id, updateDto.status);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order (RTS)' })
  cancelOrder(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id);
  }
}
