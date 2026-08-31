import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EarningsService } from './earnings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Earnings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('earnings')
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my earnings' })
  getMyEarnings(@Req() req: any) {
    return this.earningsService.getMyEarnings(req.user._id, req.query);
  }

  @Get('staff')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Get staff earnings' })
  getStaffEarnings(@Req() req: any) {
    return this.earningsService.getStaffEarnings(req.query);
  }

  @Get('agents')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Get agent earnings' })
  getAgentEarnings(@Req() req: any) {
    return this.earningsService.getAgentEarnings(req.query);
  }

  @Get('referrals')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Get referral/media buyer earnings' })
  getReferralEarnings(@Req() req: any) {
    return this.earningsService.getReferralEarnings(req.query);
  }
}
