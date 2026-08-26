import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from '../schemas/permission.schema';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { PermissionGuard } from '../guards/permission.guard';

@UseGuards(PermissionGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(
    @InjectModel(Permission.name) private permissionModel: Model<PermissionDocument>,
  ) {}

  @RequirePermission('access-control:manage')
  @Get()
  async findAll() {
    return this.permissionModel.find().exec();
  }

  @RequirePermission('access-control:manage')
  @Get('grouped')
  async findAllGrouped() {
    const permissions = await this.permissionModel.find().exec();
    const grouped = {};
    for (const perm of permissions) {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    }
    return grouped;
  }
}
