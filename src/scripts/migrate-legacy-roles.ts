import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { User, UserDocument } from '../modules/users/schemas/user.schema';
import { Department, DepartmentDocument } from '../modules/access-control/schemas/department.schema';
import { Role as NewRole, RoleDocument } from '../modules/access-control/schemas/role.schema';
import { Role as LegacyRoleEnum } from '../common/enums/role.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  const deptModel = app.get<Model<DepartmentDocument>>(getModelToken(Department.name));
  const roleModel = app.get<Model<RoleDocument>>(getModelToken(NewRole.name));

  console.log('Starting Migration: Legacy Roles to Granular Access Control...');

  // 1. Create Departments
  const opsDept = await deptModel.findOneAndUpdate({ name: 'Ops' }, { name: 'Ops' }, { upsert: true, new: true });
  const financeDept = await deptModel.findOneAndUpdate({ name: 'Finance' }, { name: 'Finance' }, { upsert: true, new: true });
  const growthDept = await deptModel.findOneAndUpdate({ name: 'Growth/Marketing' }, { name: 'Growth/Marketing' }, { upsert: true, new: true });

  const deptMap = {
    [LegacyRoleEnum.CUSTOMER_SERVICE]: opsDept._id,
    [LegacyRoleEnum.CUSTOMER_SERVICE_MANAGER]: opsDept._id,
    [LegacyRoleEnum.LOGISTICS]: opsDept._id,
    [LegacyRoleEnum.LOGISTICS_MANAGER]: opsDept._id,
    [LegacyRoleEnum.ACCOUNTANT]: financeDept._id,
    [LegacyRoleEnum.MEDIA_BUYER]: growthDept._id,
    [LegacyRoleEnum.MARKETING_MANAGER]: growthDept._id,
    [LegacyRoleEnum.ADMIN]: null,
    [LegacyRoleEnum.MANAGER]: null,
    [LegacyRoleEnum.DEV]: null,
  };

  // 2. Create Roles per legacy enum
  const roleMap: Record<string, string> = {};

  for (const legacyRole of Object.values(LegacyRoleEnum)) {
    const isSystemRole = legacyRole === LegacyRoleEnum.ADMIN || legacyRole === LegacyRoleEnum.DEV;
    const deptId = deptMap[legacyRole];

    const newRole = await roleModel.findOneAndUpdate(
      { name: legacyRole, department: deptId },
      { 
        name: legacyRole, 
        department: deptId,
        isSystemRole,
        // The permissions array would be manually tailored per role. 
        // Example for DEV/ADMIN:
        permissions: isSystemRole ? ['access-control:manage', 'users:manage', 'leads:read'] : []
      },
      { upsert: true, new: true }
    );
    roleMap[legacyRole] = newRole._id.toString();
  }

  // 3. Migrate Users
  const users = await userModel.find().exec();
  const summary: any[] = [];

  for (const user of users) {
    if (user.legacyRole && (!user.department && !user.role)) {
      user.department = deptMap[user.legacyRole] as any;
      user.role = roleMap[user.legacyRole] as any;
      await user.save();

      const existingEntry = summary.find(s => s.legacyRole === user.legacyRole);
      if (existingEntry) {
        existingEntry.userCount++;
      } else {
        summary.push({
          legacyRole: user.legacyRole,
          mappedDepartment: deptMap[user.legacyRole] ? deptMap[user.legacyRole].toString() : 'Global (null)',
          mappedRole: roleMap[user.legacyRole],
          userCount: 1,
        });
      }
    }
  }

  console.log('\nMigration Summary:');
  console.table(summary);

  console.log('\nMigration Complete.');
  await app.close();
}

bootstrap();
