import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommissionRulesService } from './commission-rules.service';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Commission Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commission-rules')
export class CommissionRulesController {
  constructor(private readonly commissionRulesService: CommissionRulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a commission rule (Admin)' })
  create(@Body() dto: CreateCommissionRuleDto) {
    return this.commissionRulesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all commission rules' })
  findAll() {
    return this.commissionRulesService.findAll();
  }
}
