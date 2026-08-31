import { Controller, Get, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('wallet/:userId')
  @ApiOperation({ summary: 'Get wallet balance for a user' })
  getWalletBalance(@Param('userId') userId: string, @Req() req: any) {
    const user = req.user;
    // Allow if requesting user is looking at their own wallet, or is Admin/Accountant
    if (user.role !== Role.ADMIN && user.role !== Role.ACCOUNTANT && user._id.toString() !== userId) {
      throw new ForbiddenException('You are not authorized to view this wallet balance.');
    }
    return this.financeService.getWalletBalance(userId);
  }

  @Get('profit')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Get total system revenue/profit' })
  getSystemRevenue() {
    return this.financeService.getSystemRevenue();
  }

  @Get('cash-flow')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Get cash flow summary (inflow vs outflow)' })
  getCashFlow(@Req() req: any) {
    return this.financeService.getCashFlow(req.query);
  }

  @Get('bank-inflow')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Get bank inflows (revenue)' })
  getBankInflow(@Req() req: any) {
    return this.financeService.getBankInflow(req.query);
  }

  @Get('expense')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Get expenses (cogs, logistics, payouts, commissions)' })
  getExpense(@Req() req: any) {
    return this.financeService.getExpense(req.query);
  }
}
