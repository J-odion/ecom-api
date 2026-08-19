import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MediaBuyersService } from './media-buyers.service';
import { CreateSpendLogDto } from './dto/create-spend-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Media Buyers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('media-buyers')
export class MediaBuyersController {
  constructor(private readonly mediaBuyersService: MediaBuyersService) {}

  @Post('spend-log')
  @ApiOperation({ summary: 'Record daily ad spend' })
  createSpendLog(@Body() createSpendLogDto: CreateSpendLogDto) {
    return this.mediaBuyersService.createSpendLog(createSpendLogDto);
  }

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.MANAGER, Role.MARKETING_MANAGER, Role.MEDIA_BUYER)
  @ApiOperation({ summary: 'Fetch team dashboard performance metrics' })
  getTeamDashboard() {
    return this.mediaBuyersService.getTeamDashboard();
  }

  @Get('performance')
  @ApiOperation({ summary: 'Fetch performance metrics' })
  getPerformanceMetrics(
    @Query('mediaBuyerId') mediaBuyerId: string,
    @Query('range') range: 'today' | 'yesterday' | 'last_week' | 'last_month' | 'custom',
    @Query('date') date?: string,
  ) {
    return this.mediaBuyersService.getPerformanceMetrics(mediaBuyerId, range || 'today', date);
  }
}
