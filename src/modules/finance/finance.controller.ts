import { Controller, Get, Param } from '@nestjs/common';
import { FinanceService } from './finance.service';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('wallet/:userId')
  getWalletBalance(@Param('userId') userId: string) {
    return this.financeService.getWalletBalance(userId);
  }

  @Get('profit')
  getSystemRevenue() {
    return this.financeService.getSystemRevenue();
  }
}
