import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { SpendLog, SpendLogSchema } from '../media-buyers/schemas/spend-log.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Transaction, TransactionSchema } from '../finance/schemas/transaction.schema';
import { Wallet, WalletSchema } from '../finance/schemas/wallet.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: SpendLog.name, schema: SpendLogSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Wallet.name, schema: WalletSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
