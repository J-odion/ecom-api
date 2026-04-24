import * as dotenv from 'dotenv';
dotenv.config();

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/user.module';
import { OrdersModule } from './modules/orders/orders.module';
import { FinanceModule } from './modules/finance/finance.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { LogisticsModule } from './modules/logistics/logistics.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI!),
    EventEmitterModule.forRoot(),
    AuthModule,
    UsersModule,
    OrdersModule,
    FinanceModule,
    InventoryModule,
    LogisticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}