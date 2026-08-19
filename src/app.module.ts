import * as dotenv from 'dotenv';
dotenv.config();

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { ProductsModule } from './modules/products/products.module';
import { CommissionRulesModule } from './modules/commission-rules/commission-rules.module';
import { LeadsModule } from './modules/leads/leads.module';
import { MediaBuyersModule } from './modules/media-buyers/media-buyers.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { LocationsModule } from './modules/locations/locations.module';
import { LeadFormsModule } from './modules/lead-forms/lead-forms.module';
import { MailModule } from './modules/mail/mail.module';
import { AuditTrailModule } from './modules/audit-trail/audit-trail.module';
import { DeviceManagementModule } from './modules/device-management/device-management.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditTrailInterceptor } from './common/interceptors/audit-trail.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI!),
    EventEmitterModule.forRoot(),
    AuthModule,
    UsersModule,
    OrdersModule,
    FinanceModule,
    InventoryModule,
    LogisticsModule,
    ProductsModule,
    CommissionRulesModule,
    LeadsModule,
    MediaBuyersModule,
    AnalyticsModule,
    LocationsModule,
    LeadFormsModule,
    MailModule,
    AuditTrailModule,
    DeviceManagementModule,
    AccountingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditTrailInterceptor,
    },
  ],
})
export class AppModule {}