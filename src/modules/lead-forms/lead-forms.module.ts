import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadForm, LeadFormSchema } from './schemas/lead-form.schema';
import { LeadFormsService } from './lead-forms.service';
import { LeadFormsController } from './lead-forms.controller';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeadForm.name, schema: LeadFormSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [LeadFormsController],
  providers: [LeadFormsService],
  exports: [LeadFormsService],
})
export class LeadFormsModule {}
