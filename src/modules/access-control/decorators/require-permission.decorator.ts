import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '../constants/permissions.constant';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';
export const RequirePermission = (permission: PermissionKey) => SetMetadata(REQUIRE_PERMISSION_KEY, permission);
