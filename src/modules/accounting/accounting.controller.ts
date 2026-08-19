import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ======================
  // CHART OF ACCOUNTS (COA)
  // ======================

  @Post('accounts/seed')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Seed the default Chart of Accounts' })
  async seedDefaultChartOfAccounts() {
    return this.accountingService.seedDefaultChartOfAccounts();
  }

  @Post('accounts')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a new Account in the COA' })
  async createAccount(@Body() dto: CreateAccountDto) {
    return this.accountingService.createAccount(dto);
  }

  @Get('accounts')
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.MANAGER)
  @ApiOperation({ summary: 'Get the full Chart of Accounts' })
  async getChartOfAccounts() {
    return this.accountingService.getChartOfAccounts();
  }

  // ======================
  // GENERAL LEDGER
  // ======================

  @Post('journals')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a DRAFT manual journal entry' })
  async createJournalEntry(@Body() dto: CreateJournalEntryDto) {
    return this.accountingService.createJournalEntry(dto);
  }

  @Post('journals/:id/post')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Post a DRAFT journal entry' })
  async postJournalEntry(@Param('id') id: string) {
    return this.accountingService.postJournalEntry(id);
  }

  @Get('journals')
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.MANAGER)
  @ApiOperation({ summary: 'List journal entries' })
  async getJournalEntries(@Query() query: any) {
    return this.accountingService.getJournalEntries(query);
  }

  @Get('journals/:id')
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.MANAGER)
  @ApiOperation({ summary: 'Get a single journal entry by ID' })
  async getJournalEntryById(@Param('id') id: string) {
    return this.accountingService.getJournalEntryById(id);
  }

  // ======================
  // PERIOD LOCKING
  // ======================

  @Post('periods')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a new accounting period' })
  async createAccountingPeriod(
    @Body('name') name: string,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
  ) {
    return this.accountingService.createAccountingPeriod(name, new Date(startDate), new Date(endDate));
  }

  @Post('periods/:id/close')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Close an accounting period to prevent further postings' })
  async closeAccountingPeriod(@Param('id') id: string) {
    return this.accountingService.closeAccountingPeriod(id);
  }
}
