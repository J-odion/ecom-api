import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeviceService } from './device.service';

@Injectable()
export class DeviceSyncWorker {
  private readonly logger = new Logger(DeviceSyncWorker.name);

  constructor(private readonly deviceService: DeviceService) {}

  // Run every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    this.logger.debug('Running scheduled device sync from Fleet...');
    await this.deviceService.syncWithProvider();
  }
}
