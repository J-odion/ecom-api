import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { AuditTrailService } from '../../audit-trail/audit-trail.service';
import { ChangeStatusDto } from '../dto/change-status.dto';
import { UserStatus } from '../enums/user-status.enum';
import { UserStatusChangedEvent } from '../events/user-status-changed.event';

@Injectable()
export class UserStatusService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private auditTrail: AuditTrailService,
    private eventEmitter: EventEmitter2,
  ) {}

  async changeStatus(userId: string, changeStatusDto: ChangeStatusDto, actorId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const currentStatus = user.status;
    const newStatus = changeStatusDto.status;

    if (currentStatus === newStatus) {
      throw new BadRequestException(`User is already in status: ${newStatus}`);
    }

    if (currentStatus === UserStatus.EXITED) {
      throw new BadRequestException('Cannot change status of an exited user. Use rehire flow instead.');
    }

    if (userId === actorId && newStatus !== UserStatus.ACTIVE) {
      throw new BadRequestException('Cannot suspend, exit, or leave-out yourself.');
    }

    // Determine token invalidation and online status
    if (newStatus !== UserStatus.ACTIVE) {
      user.tokenValidAfter = new Date();
      user.isOnline = false;
    }

    if (newStatus === UserStatus.EXITED) {
      user.isActive = false;
      user.department = null;
      user.role = null;
      // Do not clear permissionOverrides or statusHistory per spec
    }

    user.status = newStatus;
    
    if (newStatus === UserStatus.ON_LEAVE) {
      user.statusEffectiveUntil = new Date(changeStatusDto.effectiveUntil!);
    } else {
      user.statusEffectiveUntil = null;
    }

    user.statusHistory.push({
      status: newStatus,
      reason: changeStatusDto.reason || '',
      setBy: new Types.ObjectId(actorId),
      setAt: new Date(),
      effectiveUntil: user.statusEffectiveUntil,
    });

    await user.save();

    await this.auditTrail.logAction({
      userId: actorId,
      action: 'access.status.changed',
      details: { targetUserId: userId, beforeStatus: currentStatus, afterStatus: newStatus, reason: changeStatusDto.reason }
    });

    this.eventEmitter.emit('user.status.changed', new UserStatusChangedEvent(userId, currentStatus, newStatus));

    let effectiveAccessNote = 'Access granted.';
    if (newStatus !== UserStatus.ACTIVE) {
      effectiveAccessNote = `Access suspended — will not resolve permissions until status is set back to active.`;
    }

    return {
      status: user.status,
      statusHistory: user.statusHistory,
      effectiveAccessNote
    };
  }
}
