import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('webhook')
  create(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
  }

  @Get()
  findAll(@Query('assignedTo') assignedTo?: string) {
    return this.leadsService.findAll(assignedTo);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() assignLeadDto: AssignLeadDto) {
    return this.leadsService.assign(id, assignLeadDto);
  }
}
