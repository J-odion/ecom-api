import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { EarningsService } from './earnings.service';
import { EarningsController } from './earnings.controller';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { UsersModule } from '../users/user.module';
import { CommissionRulesModule } from '../commission-rules/commission-rules.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => CommissionRulesModule),
    forwardRef(() => ProductsModule),
  ],
  controllers: [FinanceController, EarningsController],
  providers: [FinanceService, EarningsService],
  exports: [FinanceService, EarningsService],
})
export class FinanceModule {}
