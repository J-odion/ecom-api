import { Controller, Get, Post, Body, Param, UseGuards, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { DeviceService } from '../services/device.service';
import { AssignmentService } from '../services/assignment.service';

@ApiTags('Devices')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DevicesController {
  private readonly logger = new Logger(DevicesController.name);

  constructor(
    private readonly deviceService: DeviceService,
    private readonly assignmentService: AssignmentService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all devices' })
  @ApiResponse({ status: 200, description: 'Return all devices.' })
  async getAllDevices() {
    return this.deviceService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new device manually' })
  async createDevice(@Body() body: any) {
    return this.deviceService.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device details' })
  async getDevice(@Param('id') id: string) {
    const device = await this.deviceService.findOne(id);
    const assignments = await this.assignmentService.getAssignmentsForDevice(id);
    const activeAssignment = assignments.find(a => a.status === 'ACTIVE');
    return { device, activeAssignment, assignments };
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign a device to a user' })
  async assignDevice(
    @Param('id') id: string,
    @Body() body: { userId: string; reason?: string },
    @Req() req: any
  ) {
    return this.assignmentService.assignDevice(id, body.userId, req.user._id, body.reason);
  }

  @Post(':id/unassign')
  @ApiOperation({ summary: 'Unassign a device from its current user' })
  async unassignDevice(@Param('id') id: string) {
    await this.assignmentService.unassignDevice(id);
    return { success: true };
  }

  @Post(':id/lock')
  @ApiOperation({ summary: 'Lock a device' })
  async lockDevice(@Param('id') id: string, @Req() req: any, @Body() body: { reason?: string }) {
    return this.deviceService.performAction(id, 'LOCK', req.user._id, body.reason);
  }

  @Post(':id/unlock')
  @ApiOperation({ summary: 'Unlock a device' })
  async unlockDevice(@Param('id') id: string, @Req() req: any, @Body() body: { reason?: string }) {
    return this.deviceService.performAction(id, 'UNLOCK', req.user._id, body.reason);
  }

  @Post(':id/wipe')
  @ApiOperation({ summary: 'Wipe a device' })
  async wipeDevice(@Param('id') id: string, @Req() req: any, @Body() body: { reason?: string }) {
    return this.deviceService.performAction(id, 'WIPE', req.user._id, body.reason);
  }

  @Get(':id/location')
  @ApiOperation({ summary: 'Get current device location from MDM provider' })
  async getDeviceLocation(@Param('id') id: string) {
    return this.deviceService.getDeviceLocation(id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get current device status from MDM provider' })
  async getDeviceStatus(@Param('id') id: string) {
    return this.deviceService.getDeviceStatus(id);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Manually trigger a sync with the MDM provider' })
  async triggerSync() {
    // Fire and forget so we don't block
    this.deviceService.syncWithProvider().catch(err => this.logger.error(err));
    return { success: true, message: 'Sync started' };
  }
}
