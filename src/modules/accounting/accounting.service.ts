import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from './schemas/account.schema';
import { JournalEntry, JournalEntryDocument } from './schemas/journal-entry.schema';
import { AccountingPeriod, AccountingPeriodDocument } from './schemas/accounting-period.schema';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(JournalEntry.name) private journalModel: Model<JournalEntryDocument>,
    @InjectModel(AccountingPeriod.name) private periodModel: Model<AccountingPeriodDocument>,
  ) {}

  // ======================
  // CHART OF ACCOUNTS (COA)
  // ======================

  async createAccount(dto: CreateAccountDto): Promise<Account> {
    const existing = await this.accountModel.findOne({ code: dto.code });
    if (existing) throw new BadRequestException(`Account code ${dto.code} already exists.`);

    if (dto.parentId) {
      const parent = await this.accountModel.findById(dto.parentId);
      if (!parent) throw new BadRequestException('Parent account not found.');
    }

    const account = new this.accountModel(dto);
    return account.save();
  }

  async getChartOfAccounts(): Promise<Account[]> {
    return this.accountModel.find().sort({ code: 1 }).exec();
  }

  async seedDefaultChartOfAccounts(): Promise<any> {
    const count = await this.accountModel.countDocuments();
    if (count > 0) {
      return { message: 'Chart of Accounts already seeded.', count };
    }

    const defaultAccounts = [
      // Assets
      { code: '1000', name: 'Cash in Bank', type: 'ASSET', normalBalance: 'DEBIT' },
      { code: '1010', name: 'Petty Cash', type: 'ASSET', normalBalance: 'DEBIT' },
      { code: '1200', name: 'Accounts Receivable', type: 'ASSET', normalBalance: 'DEBIT' },
      { code: '1300', name: 'Inventory Asset', type: 'ASSET', normalBalance: 'DEBIT' },
      
      // Liabilities
      { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', normalBalance: 'CREDIT' },
      { code: '2100', name: 'Tax Payable', type: 'LIABILITY', normalBalance: 'CREDIT' },

      // Equity
      { code: '3000', name: 'Owner Equity', type: 'EQUITY', normalBalance: 'CREDIT' },
      { code: '3100', name: 'Retained Earnings', type: 'EQUITY', normalBalance: 'CREDIT' },

      // Income
      { code: '4000', name: 'Sales Revenue', type: 'INCOME', normalBalance: 'CREDIT' },
      { code: '4100', name: 'Service Revenue', type: 'INCOME', normalBalance: 'CREDIT' },

      // COGS
      { code: '5000', name: 'Cost of Goods Sold', type: 'COGS', normalBalance: 'DEBIT' },

      // Expenses
      { code: '6000', name: 'Operating Expenses', type: 'EXPENSE', normalBalance: 'DEBIT' },
      { code: '6100', name: 'Payroll Expense', type: 'EXPENSE', normalBalance: 'DEBIT' },
      { code: '6200', name: 'Commission Expense', type: 'EXPENSE', normalBalance: 'DEBIT' },
      { code: '6300', name: 'Advertising Expense', type: 'EXPENSE', normalBalance: 'DEBIT' },
    ];

    await this.accountModel.insertMany(defaultAccounts);
    return { message: 'Default Chart of Accounts successfully seeded.', count: defaultAccounts.length };
  }

  // ======================
  // GENERAL LEDGER
  // ======================

  async createJournalEntry(dto: CreateJournalEntryDto): Promise<JournalEntry> {
    await this.validateAccountingPeriod(new Date(dto.date));

    // Validate accounts
    for (const line of dto.lines) {
      const account = await this.accountModel.findById(line.accountId);
      if (!account) {
        throw new BadRequestException(`Account ID ${line.accountId} not found in Chart of Accounts.`);
      }
      if (!account.isActive) {
         throw new BadRequestException(`Account ${account.code} (${account.name}) is inactive.`);
      }
    }

    const journal = new this.journalModel(dto);
    // The pre-save hook will enforce Debit == Credit
    return journal.save();
  }

  async postJournalEntry(id: string): Promise<JournalEntry> {
    const journal = await this.journalModel.findById(id);
    if (!journal) throw new NotFoundException('Journal entry not found.');

    if (journal.status === 'POSTED') {
      throw new BadRequestException('Journal entry is already POSTED.');
    }

    journal.status = 'POSTED';
    return journal.save(); // Will trigger pre-save balancing checks again just to be safe
  }

  async getJournalEntries(query: any = {}): Promise<JournalEntry[]> {
    return this.journalModel.find(query).populate('lines.accountId').sort({ date: -1, createdAt: -1 }).exec();
  }

  async getJournalEntryById(id: string): Promise<JournalEntry> {
    const journal = await this.journalModel.findById(id).populate('lines.accountId');
    if (!journal) throw new NotFoundException('Journal entry not found.');
    return journal;
  }

  // ======================
  // PERIOD LOCKING
  // ======================

  private async validateAccountingPeriod(date: Date): Promise<void> {
    // Basic logic: if an accounting period exists for this date, it must be OPEN.
    // In a mature system, you might mandate that EVERY date falls into a defined period.
    // For Phase 1, we just ensure we don't post into a CLOSED period.
    const periods = await this.periodModel.find({
      startDate: { $lte: date },
      endDate: { $gte: date }
    }).exec();

    for (const period of periods) {
      if (period.status === 'CLOSED') {
        throw new BadRequestException(`Cannot post to date ${date.toISOString()} because the accounting period "${period.name}" is CLOSED.`);
      }
    }
  }

  async createAccountingPeriod(name: string, startDate: Date, endDate: Date): Promise<AccountingPeriod> {
    const period = new this.periodModel({ name, startDate, endDate });
    return period.save();
  }

  async closeAccountingPeriod(id: string): Promise<AccountingPeriod> {
    const period = await this.periodModel.findById(id);
    if (!period) throw new NotFoundException('Accounting period not found.');
    period.status = 'CLOSED';
    return period.save();
  }
}
