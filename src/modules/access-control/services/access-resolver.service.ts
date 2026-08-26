import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { RoleDocument } from '../schemas/role.schema';
import { DepartmentDocument } from '../schemas/department.schema';

export interface ResolvedAccess {
  department: Types.ObjectId | null;
  role: Types.ObjectId | null;
  effectivePermissions: Set<string>;
  overrides: any[];
  sourceMap: Record<string, 'department' | 'role' | 'override'>;
}

@Injectable()
export class AccessResolverService {
  private readonly logger = new Logger(AccessResolverService.name);
  
  // TODO: swap for Redis
  private cache = new Map<string, { data: ResolvedAccess, expiresAt: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 mins

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async resolveEffectivePermissions(userId: string): Promise<Set<string>> {
    const detail = await this.getAccessDetail(userId);
    return detail.effectivePermissions;
  }

  async getAccessDetail(userId: string): Promise<ResolvedAccess> {
    const user = await this.userModel.findById(userId)
      .populate<{ department: DepartmentDocument }>('department')
      .populate<{ role: RoleDocument }>('role')
      .exec();

    if (!user) throw new Error('User not found');

    const dVersion = user.department?.version || 0;
    const rVersion = user.role?.version || 0;
    const cacheKey = `access:${userId}:r${rVersion}:d${dVersion}`;
    
    // overrides change requires bumping version or evicting. Wait, overrides are on the user, so evicting is better, or we can just add an overrides hash/length if we want. For now, since user record is fetched, we will just not cache if we want strictly correct override updates, OR we can cache but the cache bust must clear this user's key. 
    // The spec says: "Bust the relevant cache key(s)." when mutating overrides. So we can use the cache.

    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const effectivePermissions = new Set<string>();
    const sourceMap: Record<string, 'department' | 'role' | 'override'> = {};

    // 1. Department defaults
    if (user.department && user.department.defaultPermissions) {
      for (const perm of user.department.defaultPermissions) {
        effectivePermissions.add(perm);
        sourceMap[perm] = 'department';
      }
    }

    // 2. Role permissions
    if (user.role && user.role.permissions) {
      for (const perm of user.role.permissions) {
        effectivePermissions.add(perm);
        sourceMap[perm] = 'role';
      }
    }

    // 3. User overrides
    const overrides = user.permissionOverrides || [];
    for (const override of overrides) {
      if (override.granted) {
        effectivePermissions.add(override.permissionKey);
        sourceMap[override.permissionKey] = 'override';
      } else {
        effectivePermissions.delete(override.permissionKey);
        // We still map it to override to indicate the 'deny' came from an override.
        // Actually, effectivePermissions won't have it, but sourceMap can keep the record.
        delete sourceMap[override.permissionKey]; 
      }
    }

    const data: ResolvedAccess = {
      department: user.department ? user.department._id : null,
      role: user.role ? user.role._id : null,
      effectivePermissions,
      overrides,
      sourceMap,
    };

    this.cache.set(cacheKey, { data, expiresAt: now + this.TTL });
    return data;
  }

  bustCacheForUser(userId: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`access:${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }
}
