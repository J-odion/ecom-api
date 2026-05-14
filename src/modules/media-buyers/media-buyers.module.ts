import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaBuyersController } from './media-buyers.controller';
import { MediaBuyersService } from './media-buyers.service';
import { SpendLog, SpendLogSchema } from './schemas/spend-log.schema';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SpendLog.name, schema: SpendLogSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [MediaBuyersController],
  providers: [MediaBuyersService],
  exports: [MediaBuyersService],
})
export class MediaBuyersModule {}
