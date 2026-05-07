import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MediaBuyersService } from './media-buyers.service';
import { CreateSpendLogDto } from './dto/create-spend-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

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

  @Get('performance')
  @ApiOperation({ summary: 'Fetch performance metrics' })
  getPerformanceMetrics(
    @Query('mediaBuyerId') mediaBuyerId: string,
    @Query('range') range: 'daily' | 'weekly' | 'monthly',
  ) {
    return this.mediaBuyersService.getPerformanceMetrics(mediaBuyerId, range || 'daily');
  }
}
