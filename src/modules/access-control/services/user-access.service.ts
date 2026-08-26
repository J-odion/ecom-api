import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { AccessResolverService, ResolvedAccess } from './access-resolver.service';
import { AuditTrailService } from '../../audit-trail/audit-trail.service';
import { ToggleAccessDto } from '../dto/toggle-access.dto';
import { BulkToggleAccessDto } from '../dto/bulk-toggle-access.dto';

@Injectable()
export class UserAccessService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private accessResolver: AccessResolverService,
    private auditTrail: AuditTrailService,
  ) {}

  async getAccess(userId: string): Promise<ResolvedAccess> {
    return this.accessResolver.getAccessDetail(userId);
  }

  async setDepartment(userId: string, departmentId: string, actorId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const before = await this.accessResolver.getAccessDetail(userId);

    user.department = departmentId as any;
    await user.save();

    this.accessResolver.bustCacheForUser(userId);
    const after = await this.accessResolver.getAccessDetail(userId);

    await this.auditTrail.logAction({
      userId: actorId,
      action: 'access.department.assigned',
      details: { targetUserId: userId, departmentId, before, after }
    });

    return after;
  }

  async setRole(userId: string, roleId: string, actorId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const before = await this.accessResolver.getAccessDetail(userId);

    user.role = roleId as any;
    await user.save();

    this.accessResolver.bustCacheForUser(userId);
    const after = await this.accessResolver.getAccessDetail(userId);

    await this.auditTrail.logAction({
      userId: actorId,
      action: 'access.role.assigned',
      details: { targetUserId: userId, roleId, before, after }
    });

    return after;
  }

  async toggleAccess(userId: string, toggleDto: ToggleAccessDto, actorId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const before = await this.accessResolver.getAccessDetail(userId);

    // Prevent self-lockout
    if (userId === actorId && toggleDto.permissionKey === 'access-control:manage' && !toggleDto.granted) {
      const willHaveWithoutOverride = before.sourceMap['access-control:manage'] === 'role' || before.sourceMap['access-control:manage'] === 'department';
      // Wait, if it's already in role, overriding it to false removes it.
      if (!toggleDto.granted) {
        throw new BadRequestException('Cannot revoke your own access-control:manage permission.');
      }
    }

    const isRedundant = 
      (toggleDto.granted && (before.sourceMap[toggleDto.permissionKey] === 'role' || before.sourceMap[toggleDto.permissionKey] === 'department')) ||
      (!toggleDto.granted && !before.effectivePermissions.has(toggleDto.permissionKey));

    if (isRedundant && !user.permissionOverrides.some(o => o.permissionKey === toggleDto.permissionKey)) {
       return { redundant: true, currentAccess: before };
    }

    const existingIndex = user.permissionOverrides.findIndex(o => o.permissionKey === toggleDto.permissionKey);
    if (existingIndex > -1) {
      user.permissionOverrides[existingIndex].granted = toggleDto.granted;
      user.permissionOverrides[existingIndex].setBy = new Types.ObjectId(actorId);
      user.permissionOverrides[existingIndex].setAt = new Date();
      user.permissionOverrides[existingIndex].reason = toggleDto.reason;
    } else {
      user.permissionOverrides.push({
        permissionKey: toggleDto.permissionKey,
        granted: toggleDto.granted,
        setBy: new Types.ObjectId(actorId),
        setAt: new Date(),
        reason: toggleDto.reason
      });
    }

    await user.save();
    this.accessResolver.bustCacheForUser(userId);
    const after = await this.accessResolver.getAccessDetail(userId);

    await this.auditTrail.logAction({
      userId: actorId,
      action: 'access.override.set',
      details: { targetUserId: userId, toggleDto, before, after }
    });

    return after;
  }

  async removeOverride(userId: string, permissionKey: string, actorId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const before = await this.accessResolver.getAccessDetail(userId);

    const existingIndex = user.permissionOverrides.findIndex(o => o.permissionKey === permissionKey);
    if (existingIndex === -1) {
      return before; // Nothing to remove
    }

    // Prevent self-lockout if removing a granted override causes loss of access
    if (userId === actorId && permissionKey === 'access-control:manage' && user.permissionOverrides[existingIndex].granted) {
       // if it falls back to a role/department, it's fine.
       if (before.sourceMap['access-control:manage'] !== 'role' && before.sourceMap['access-control:manage'] !== 'department') {
          throw new BadRequestException('Cannot revoke your own access-control:manage permission.');
       }
    }

    user.permissionOverrides.splice(existingIndex, 1);
    await user.save();

    this.accessResolver.bustCacheForUser(userId);
    const after = await this.accessResolver.getAccessDetail(userId);

    await this.auditTrail.logAction({
      userId: actorId,
      action: 'access.override.removed',
      details: { targetUserId: userId, permissionKey, before, after }
    });

    return after;
  }

  async bulkToggleAccess(userId: string, bulkDto: BulkToggleAccessDto, actorId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const before = await this.accessResolver.getAccessDetail(userId);

    for (const toggle of bulkDto.toggles) {
      if (userId === actorId && toggle.permissionKey === 'access-control:manage' && !toggle.granted) {
        throw new BadRequestException('Cannot revoke your own access-control:manage permission.');
      }

      const existingIndex = user.permissionOverrides.findIndex(o => o.permissionKey === toggle.permissionKey);
      if (existingIndex > -1) {
        user.permissionOverrides[existingIndex].granted = toggle.granted;
        user.permissionOverrides[existingIndex].setBy = new Types.ObjectId(actorId);
        user.permissionOverrides[existingIndex].setAt = new Date();
        user.permissionOverrides[existingIndex].reason = toggle.reason || bulkDto.reason;
      } else {
        user.permissionOverrides.push({
          permissionKey: toggle.permissionKey,
          granted: toggle.granted,
          setBy: new Types.ObjectId(actorId),
          setAt: new Date(),
          reason: toggle.reason || bulkDto.reason
        });
      }
    }

    await user.save();
    this.accessResolver.bustCacheForUser(userId);
    const after = await this.accessResolver.getAccessDetail(userId);

    await this.auditTrail.logAction({
      userId: actorId,
      action: 'access.override.bulk_set',
      details: { targetUserId: userId, toggles: bulkDto.toggles, reason: bulkDto.reason, before, after }
    });

    return after;
  }
}
