import { Controller, Post, Body, Patch, Param, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './schemas/order.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.ADMIN,
  Role.MANAGER,
  Role.CUSTOMER_SERVICE,
  Role.CUSTOMER_SERVICE_MANAGER,
  Role.LOGISTICS,
  Role.LOGISTICS_MANAGER,
  Role.MARKETING_MANAGER,
  Role.ACCOUNTANT,
  Role.DEV,
)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order (Scheduled)' })
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    const actor = req.user
      ? { id: req.user._id?.toString(), name: req.user.fullName || req.user.email }
      : undefined;
    return this.ordersService.create(createOrderDto, actor);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  findAll(
    @Query('logisticsId') logisticsId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.findAll(logisticsId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID — logs a VIEW activity' })
  findOne(@Param('id') id: string, @Req() req: any) {
    const actor = req.user
      ? { id: req.user._id?.toString(), name: req.user.fullName || req.user.email }
      : undefined;
    return this.ordersService.findOne(id, actor);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get the full activity timeline for an order' })
  getActivity(@Param('id') id: string) {
    return this.ordersService.getActivity(id);
  }

  @Patch(':id/delivery-status')
  @ApiOperation({ summary: 'Update delivery status (Logistics)' })
  updateDeliveryStatus(
    @Param('id') id: string,
    @Body() updateDto: { status: OrderStatus; deliveryFee?: number },
    @Req() req: any,
  ) {
    const actor = req.user
      ? { id: req.user._id?.toString(), name: req.user.fullName || req.user.email }
      : undefined;
    return this.ordersService.updateDeliveryStatus(id, updateDto.status, updateDto.deliveryFee, actor);
  }

  @Patch(':id/payment-status')
  @ApiOperation({ summary: 'Confirm cash remittance (Accountant)' })
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() updateDto: { status: OrderStatus },
    @Req() req: any,
  ) {
    const actor = req.user
      ? { id: req.user._id?.toString(), name: req.user.fullName || req.user.email }
      : undefined;
    return this.ordersService.updatePaymentStatus(id, updateDto.status, actor);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order (RTS)' })
  cancelOrder(@Param('id') id: string, @Req() req: any) {
    const actor = req.user
      ? { id: req.user._id?.toString(), name: req.user.fullName || req.user.email }
      : undefined;
    return this.ordersService.cancelOrder(id, actor);
  }

  @Patch(':id/follow-up')
  @ApiOperation({ summary: 'Update follow-up date (CS)' })
  updateFollowUpDate(
    @Param('id') id: string,
    @Body() updateDto: { followUpDate: string; notes?: string },
    @Req() req: any,
  ) {
    const actor = req.user
      ? { id: req.user._id?.toString(), name: req.user.fullName || req.user.email }
      : undefined;
    return this.ordersService.updateFollowUp(id, new Date(updateDto.followUpDate), updateDto.notes, actor);
  }
}
