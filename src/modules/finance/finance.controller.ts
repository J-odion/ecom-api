import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('wallet/:userId')
  @ApiOperation({ summary: 'Get wallet balance for a user' })
  getWalletBalance(@Param('userId') userId: string) {
    return this.financeService.getWalletBalance(userId);
  }

  @Get('profit')
  @ApiOperation({ summary: 'Get total system revenue/profit' })
  getSystemRevenue() {
    return this.financeService.getSystemRevenue();
  }
}
