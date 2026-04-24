import { Controller, Post, Body, Patch, Param, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LogisticsService } from './logistics.service';
import { AssignDeliveryDto, UpdateDeliveryStatusDto } from './dto/assign-delivery.dto';
import { DeliveryStatus } from './schemas/delivery.schema';

@ApiTags('Logistics')
@ApiBearerAuth()
@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post('deliveries/assign')
  @ApiOperation({ summary: 'Assign an order to a delivery agent' })
  assignDelivery(@Body() dto: AssignDeliveryDto) {
    return this.logisticsService.assignDelivery(dto);
  }

  @Patch('deliveries/:id/status')
  @ApiOperation({ summary: 'Update the status of a delivery' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.logisticsService.updateStatus(id, dto.status as DeliveryStatus);
  }

  @Get('deliveries')
  @ApiOperation({ summary: 'Get all deliveries' })
  findAll() {
    return this.logisticsService.findAll();
  }
}
