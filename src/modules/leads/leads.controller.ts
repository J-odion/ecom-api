import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Req } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeadStatus } from './schemas/lead.schema';

import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.ADMIN,
  Role.MANAGER,
  Role.CUSTOMER_SERVICE,
  Role.CUSTOMER_SERVICE_MANAGER,
  Role.LOGISTICS,
  Role.LOGISTICS_MANAGER,
  Role.MARKETING_MANAGER,
  Role.ACCOUNTANT,
  Role.DEV,
)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /**
   * Progressive Capture: Capture data as the user types.
   * Public endpoint for the embeddable form.
   */
  @Public()
  @Post('partial')
  @ApiOperation({ summary: 'Public: Capture lead data incrementally (Progressive Capture)' })
  createPartial(@Body() partialLeadDto: Partial<CreateLeadDto>) {
    return this.leadsService.createPartial(partialLeadDto);
  }

  /**
   * Final Webhook submission from the form.
   */
  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Public: Final submission from lead capture form' })
  createFromForm(@Body() createLeadDto: CreateLeadDto) {
    // We cast to any or ensure DTO is valid
    return this.leadsService.createFromWebhook(createLeadDto);
  }

  /**
   * Manual entry by staff.
   */
  @Post()
  @ApiOperation({ summary: 'Protected: Manually create a lead (CS / Manager)' })
  createManual(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.createManual(createLeadDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all leads with filters for identity (duplicates, returning)' })
  findAll(@Query() query: any) {
    return this.leadsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single lead by ID' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Reassign a lead' })
  assign(@Param('id') id: string, @Body() assignLeadDto: AssignLeadDto) {
    return this.leadsService.assign(id, assignLeadDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update lead status' })
  updateStatus(@Param('id') id: string, @Body('status') status: LeadStatus) {
    return this.leadsService.updateStatus(id, status);
  }
}
