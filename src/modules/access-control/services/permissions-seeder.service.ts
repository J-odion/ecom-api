import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from '../schemas/permission.schema';
import { PERMISSIONS } from '../constants/permissions.constant';

@Injectable()
export class PermissionsSeederService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsSeederService.name);

  constructor(
    @InjectModel(Permission.name) private permissionModel: Model<PermissionDocument>,
  ) {}

  async onModuleInit() {
    let seeded = 0;
    for (const perm of PERMISSIONS) {
      await this.permissionModel.updateOne(
        { key: perm.key },
        {
          $set: {
            module: perm.module,
            action: perm.action,
            description: perm.description,
            isSensitive: perm.isSensitive,
          }
        },
        { upsert: true }
      );
      seeded++;
    }
    this.logger.log(`Seeded/updated ${seeded} permissions`);
  }
}
