import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Permission, PermissionSchema } from './schemas/permission.schema';
import { Department, DepartmentSchema } from './schemas/department.schema';
import { Role, RoleSchema } from './schemas/role.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

import { DepartmentsController } from './controllers/departments.controller';
import { RolesController } from './controllers/roles.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { UserAccessController } from './controllers/user-access.controller';
import { UserStatusController } from './controllers/user-status.controller';

import { DepartmentsService } from './services/departments.service';
import { RolesService } from './services/roles.service';
import { UserAccessService } from './services/user-access.service';
import { UserStatusService } from './services/user-status.service';
import { AccessResolverService } from './services/access-resolver.service';
import { PermissionsSeederService } from './services/permissions-seeder.service';

import { AuditTrailModule } from '../audit-trail/audit-trail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Permission.name, schema: PermissionSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuditTrailModule,
  ],
  controllers: [
    DepartmentsController,
    RolesController,
    PermissionsController,
    UserAccessController,
    UserStatusController,
  ],
  providers: [
    DepartmentsService,
    RolesService,
    UserAccessService,
    UserStatusService,
    AccessResolverService,
    PermissionsSeederService,
  ],
  exports: [
    AccessResolverService,
  ],
})
export class AccessControlModule {}
