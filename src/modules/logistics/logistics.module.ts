import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogisticsService } from './logistics.service';
import { LogisticsController } from './logistics.controller';
import { Delivery, DeliverySchema } from './schemas/delivery.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Delivery.name, schema: DeliverySchema }]),
  ],
  controllers: [LogisticsController],
  providers: [LogisticsService],
  exports: [LogisticsService],
})
export class LogisticsModule {}
