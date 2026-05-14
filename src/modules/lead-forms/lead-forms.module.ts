import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadForm, LeadFormSchema } from './schemas/lead-form.schema';
import { LeadFormsService } from './lead-forms.service';
import { LeadFormsController } from './lead-forms.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LeadForm.name, schema: LeadFormSchema }]),
  ],
  controllers: [LeadFormsController],
  providers: [LeadFormsService],
  exports: [LeadFormsService],
})
export class LeadFormsModule {}
