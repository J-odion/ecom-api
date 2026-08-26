import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { UserAccessService } from '../services/user-access.service';
import { ToggleAccessDto } from '../dto/toggle-access.dto';
import { BulkToggleAccessDto } from '../dto/bulk-toggle-access.dto';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { PermissionGuard } from '../guards/permission.guard';

@UseGuards(PermissionGuard)
@Controller('users/:id/access')
export class UserAccessController {
  constructor(private readonly userAccessService: UserAccessService) {}

  @RequirePermission('access-control:manage')
  @Get()
  getAccess(@Param('id') id: string) {
    return this.userAccessService.getAccess(id);
  }

  @RequirePermission('access-control:manage')
  @Patch('department')
  setDepartment(@Param('id') id: string, @Body('departmentId') departmentId: string, @Request() req: any) {
    return this.userAccessService.setDepartment(id, departmentId, req.user._id);
  }

  @RequirePermission('access-control:manage')
  @Patch('role')
  setRole(@Param('id') id: string, @Body('roleId') roleId: string, @Request() req: any) {
    return this.userAccessService.setRole(id, roleId, req.user._id);
  }

  @RequirePermission('access-control:manage')
  @Patch('toggle')
  toggleAccess(@Param('id') id: string, @Body() toggleDto: ToggleAccessDto, @Request() req: any) {
    return this.userAccessService.toggleAccess(id, toggleDto, req.user._id);
  }

  @RequirePermission('access-control:manage')
  @Delete('override/:key')
  removeOverride(@Param('id') id: string, @Param('key') key: string, @Request() req: any) {
    return this.userAccessService.removeOverride(id, key, req.user._id);
  }

  @RequirePermission('access-control:manage')
  @Post('bulk-toggle')
  bulkToggleAccess(@Param('id') id: string, @Body() bulkDto: BulkToggleAccessDto, @Request() req: any) {
    return this.userAccessService.bulkToggleAccess(id, bulkDto, req.user._id);
  }
}
