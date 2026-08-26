import { UserStatus } from '../enums/user-status.enum';

export class UserStatusChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly previousStatus: UserStatus,
    public readonly newStatus: UserStatus,
  ) {}
}
