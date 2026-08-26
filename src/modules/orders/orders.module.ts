import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrderActivity, OrderActivitySchema } from './schemas/order-activity.schema';
import { OrderActivityService } from './order-activity.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderActivity.name, schema: OrderActivitySchema },
    ]),
    InventoryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderActivityService],
  exports: [OrdersService, OrderActivityService],
})
export class OrdersModule {}
