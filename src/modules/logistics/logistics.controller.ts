import { Controller, Post, Body, Patch, Param, Get } from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { AssignDeliveryDto, UpdateDeliveryStatusDto } from './dto/assign-delivery.dto';
import { DeliveryStatus } from './schemas/delivery.schema';

@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post('deliveries/assign')
  assignDelivery(@Body() dto: AssignDeliveryDto) {
    return this.logisticsService.assignDelivery(dto);
  }

  @Patch('deliveries/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.logisticsService.updateStatus(id, dto.status as DeliveryStatus);
  }

  @Get('deliveries')
  findAll() {
    return this.logisticsService.findAll();
  }
}
