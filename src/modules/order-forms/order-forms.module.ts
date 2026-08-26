import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderForm, OrderFormSchema } from './schemas/order-form.schema';
import { OrderFormsService } from './order-forms.service';
import { OrderFormsController } from './order-forms.controller';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrderForm.name, schema: OrderFormSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [OrderFormsController],
  providers: [OrderFormsService],
  exports: [OrderFormsService],
})
export class OrderFormsModule {}
