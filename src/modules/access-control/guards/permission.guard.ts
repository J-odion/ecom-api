import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessResolverService } from '../services/access-resolver.service';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessResolver: AccessResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) return false;

    // Stage 2 Dual-Check: check legacyRole first, then fallback to resolved
    // To implement the dual-check, we'd need to know what legacy roles map to what permissions, 
    // but the spec states: "PermissionGuard updated to pass if legacy role check OR new resolved check passes".
    // For now, since we are building the access-control module, we focus on the resolved check. 
    // We can check if legacyRoles guard was provided on the route via 'roles' metadata.
    const legacyRoles = this.reflector.getAllAndOverride<string[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (legacyRoles && legacyRoles.includes(user.role)) {
      return true; // Legacy role passed
    }

    // New granular permission check
    const permissions = await this.accessResolver.resolveEffectivePermissions(user._id);
    return permissions.has(requiredPermission);
  }
}
