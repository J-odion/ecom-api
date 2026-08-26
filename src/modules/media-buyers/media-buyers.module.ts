import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaBuyersController } from './media-buyers.controller';
import { MediaBuyersService } from './media-buyers.service';
import { SpendLog, SpendLogSchema } from './schemas/spend-log.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Transaction, TransactionSchema } from '../finance/schemas/transaction.schema';
import { Wallet, WalletSchema } from '../finance/schemas/wallet.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SpendLog.name, schema: SpendLogSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Wallet.name, schema: WalletSchema },
    ]),
  ],
  controllers: [MediaBuyersController],
  providers: [MediaBuyersService],
  exports: [MediaBuyersService],
})
export class MediaBuyersModule {}
