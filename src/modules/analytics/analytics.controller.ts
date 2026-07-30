import { Controller, Get, UseGuards, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER_SERVICE_MANAGER, Role.LOGISTICS_MANAGER, Role.MARKETING_MANAGER)
  @ApiOperation({ summary: 'Get management dashboard metrics' })
  getDashboard() {
    return this.analyticsService.getManagementDashboard();
  }

  @Get('cs-dashboard')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER_SERVICE, Role.CUSTOMER_SERVICE_MANAGER)
  @ApiOperation({ summary: 'Get CS dashboard metrics' })
  getCsDashboard(@Query('agentId') agentId?: string, @Req() req?: any) {
    const userId = agentId || req.user._id;
    return this.analyticsService.getCsDashboard(userId);
  }
}
