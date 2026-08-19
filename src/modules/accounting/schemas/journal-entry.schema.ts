import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';

export type JournalEntryDocument = JournalEntry & Document;

@Schema()
export class JournalLine {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  accountId: Types.ObjectId;

  @Prop({ default: 0 })
  debit: number;

  @Prop({ default: 0 })
  credit: number;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  departmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Location' })
  locationId?: Types.ObjectId;
}

export const JournalLineSchema = SchemaFactory.createForClass(JournalLine);

@Schema({ timestamps: true })
export class JournalEntry {
  @Prop({ required: true, unique: true })
  journalNumber: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  description: string;

  @Prop()
  referenceId?: string;

  @Prop({ required: true, enum: ['DRAFT', 'POSTED', 'VOIDED'], default: 'DRAFT' })
  status: string;

  @Prop({ type: [JournalLineSchema], required: true })
  lines: JournalLine[];
}

export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);

// Pre-save hook to enforce balancing
JournalEntrySchema.pre('save', function (next: any) {
  if (this.isModified('lines') || this.isNew) {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of this.lines) {
      totalDebit += line.debit || 0;
      totalCredit += line.credit || 0;
    }

    // Rounding to 2 decimal places to avoid floating point precision issues
    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    if (totalDebit !== totalCredit) {
      return next(new BadRequestException(`Journal entry is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`));
    }
    
    if (totalDebit === 0 && totalCredit === 0) {
       return next(new BadRequestException('Journal entry must have a non-zero value.'));
    }
  }
  next();
});

// Pre-delete hook to enforce immutability of POSTED journals
JournalEntrySchema.pre('deleteOne', { document: true, query: false }, function (next: any) {
  if (this.status === 'POSTED') {
    return next(new BadRequestException('Cannot delete a POSTED journal entry.'));
  }
  next();
});
