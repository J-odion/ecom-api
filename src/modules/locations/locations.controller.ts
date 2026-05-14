import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new location (Office/Warehouse)' })
  create(@Body() dto: { name: string; address?: string }) {
    return this.locationsService.create(dto.name, dto.address);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active locations' })
  findAll() {
    return this.locationsService.findAll();
  }
}
