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

  // ======================
  // REPORTS
  // ======================

  private buildFilterQuery(query: any) {
    const match: any = { status: 'POSTED' };
    
    if (query.date) {
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      
      switch (query.date) {
        case 'this_week':
          startDate.setDate(now.getDate() - now.getDay());
          break;
        case 'last_week':
          startDate.setDate(now.getDate() - now.getDay() - 7);
          endDate.setDate(now.getDate() - now.getDay() - 1);
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        default:
          if (query.startDate && query.endDate) {
            startDate = new Date(query.startDate);
            endDate = new Date(query.endDate);
          }
      }
      match.date = { $gte: startDate, $lte: endDate };
    }
    
    return match;
  }

  private async calculateAccountBalances(query: any, accountTypes: string[]) {
    const accounts = await this.accountModel.find({ type: { $in: accountTypes } });
    const accountIds = accounts.map(a => a._id);
    
    const match = this.buildFilterQuery(query);
    
    // Additional line filters (e.g., state, office, product)
    const lineMatch: any = { 'lines.accountId': { $in: accountIds } };
    if (query.state) lineMatch['lines.state'] = query.state;
    if (query.officeId) lineMatch['lines.locationId'] = new Types.ObjectId(query.officeId);
    if (query.productId) lineMatch['lines.productId'] = new Types.ObjectId(query.productId);
    
    const journals = await this.journalModel.find(match).populate('lines.accountId');
    
    const balances = {};
    accounts.forEach(a => { balances[a._id.toString()] = { name: a.name, code: a.code, type: a.type, balance: 0, normalBalance: a.normalBalance } });
    
    journals.forEach(journal => {
      journal.lines.forEach((line: any) => {
        if (balances[line.accountId._id.toString()]) {
           // check if line matches filters
           let matches = true;
           if (query.state && line.state !== query.state) matches = false;
           if (query.officeId && line.locationId?.toString() !== query.officeId) matches = false;
           if (query.productId && line.productId?.toString() !== query.productId) matches = false;
           
           if (matches) {
             const account = balances[line.accountId._id.toString()];
             if (account.normalBalance === 'DEBIT') {
                account.balance += (line.debit || 0) - (line.credit || 0);
             } else {
                account.balance += (line.credit || 0) - (line.debit || 0);
             }
           }
        }
      });
    });
    
    return Object.values(balances);
  }

  async getIncomeStatement(query: any) {
    const balances: any = await this.calculateAccountBalances(query, ['INCOME', 'COGS', 'EXPENSE']);
    
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalExpenses = 0;
    
    balances.forEach(b => {
      if (b.type === 'INCOME') totalRevenue += b.balance;
      if (b.type === 'COGS') totalCogs += b.balance;
      if (b.type === 'EXPENSE') totalExpenses += b.balance;
    });
    
    const grossProfit = totalRevenue - totalCogs;
    const netIncome = grossProfit - totalExpenses;
    
    return {
      revenue: balances.filter(b => b.type === 'INCOME'),
      totalRevenue,
      cogs: balances.filter(b => b.type === 'COGS'),
      totalCogs,
      grossProfit,
      expenses: balances.filter(b => b.type === 'EXPENSE'),
      totalExpenses,
      netIncome
    };
  }

  async getBalanceSheet(query: any) {
    const balances: any = await this.calculateAccountBalances(query, ['ASSET', 'LIABILITY', 'EQUITY']);
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    
    balances.forEach(b => {
      if (b.type === 'ASSET') totalAssets += b.balance;
      if (b.type === 'LIABILITY') totalLiabilities += b.balance;
      if (b.type === 'EQUITY') totalEquity += b.balance;
    });
    
    // Retained Earnings (Net Income from all time up to the query date)
    // We would ideally calculate net income up to the end date. For simplicity, we just return the categorized balances.
    
    return {
      assets: balances.filter(b => b.type === 'ASSET'),
      totalAssets,
      liabilities: balances.filter(b => b.type === 'LIABILITY'),
      totalLiabilities,
      equity: balances.filter(b => b.type === 'EQUITY'),
      totalEquity
    };
  }

  async getCashFlowStatement(query: any) {
    // Simplified Cash Flow: Changes in Cash and Bank Accounts
    // In a real system, you'd categorize by Operating, Investing, Financing.
    const balances: any = await this.calculateAccountBalances(query, ['ASSET']);
    
    const cashAccounts = balances.filter(b => b.name.toLowerCase().includes('cash') || b.name.toLowerCase().includes('bank'));
    const totalCashChange = cashAccounts.reduce((sum, b) => sum + b.balance, 0);
    
    return {
      cashAccounts,
      netCashFlow: totalCashChange
    };
  }
}
