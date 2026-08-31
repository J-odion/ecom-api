import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Device, DeviceDocument, DeviceStatus } from '../schemas/device.schema';
import { DeviceAction, DeviceActionDocument, ActionStatus } from '../schemas/device-action.schema';
import { DEVICE_PROVIDER } from '../providers/device-provider.interface';
import type { DeviceProvider } from '../providers/device-provider.interface';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
    @InjectModel(DeviceAction.name) private actionModel: Model<DeviceActionDocument>,
    @Inject(DEVICE_PROVIDER) private deviceProvider: DeviceProvider,
  ) {}

  async findAll(organizationId?: string): Promise<DeviceDocument[]> {
    const filter = organizationId ? { organizationId: new Types.ObjectId(organizationId) } : {};
    return this.deviceModel.find(filter).exec();
  }

  async create(createData: any): Promise<DeviceDocument> {
    const device = new this.deviceModel({
      ...createData,
      status: createData.status || DeviceStatus.PENDING_ENROLLMENT,
    });
    return device.save();
  }

  async findOne(id: string): Promise<DeviceDocument> {
    const device = await this.deviceModel.findById(id).exec();
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  async syncWithProvider(): Promise<void> {
    this.logger.log('Starting device sync with provider...');
    try {
      const remoteDevices = await this.deviceProvider.listDevices();
      
      for (const rd of remoteDevices) {
        // Upsert device in our DB based on serialNumber or fleetHostId
        await this.deviceModel.findOneAndUpdate(
          { serialNumber: rd.serialNumber },
          {
            $set: {
              fleetHostId: rd.fleetHostId,
              uuid: rd.uuid,
              name: rd.name,
              type: rd.type,
              manufacturer: rd.manufacturer,
              model: rd.model,
              os: rd.os,
              osVersion: rd.osVersion,
              lastSeenAt: rd.lastSeenAt,
              // We map provider status to our status loosely if needed, or keep separate
            },
          },
          { upsert: true, new: true }
        );
      }
      this.logger.log(`Synced ${remoteDevices.length} devices.`);
    } catch (error) {
      this.logger.error('Failed to sync devices', error);
    }
  }

  async performAction(id: string, actionType: string, userId: string, reason?: string): Promise<any> {
    const device = await this.findOne(id);
    if (!device.fleetHostId) {
      throw new Error('Device does not have a provider ID linked');
    }

    // 1. Create audit log
    const audit = new this.actionModel({
      deviceId: device._id,
      actionType,
      initiatedBy: new Types.ObjectId(userId),
      reason,
      status: ActionStatus.PENDING,
    });
    await audit.save();

    // 2. Perform action via provider
    try {
      let result;
      switch (actionType) {
        case 'LOCK':
          result = await this.deviceProvider.lockDevice(device.fleetHostId);
          if (result.success) {
            device.status = DeviceStatus.LOCKED;
            await device.save();
          }
          break;
        case 'UNLOCK':
          result = await this.deviceProvider.unlockDevice(device.fleetHostId);
          if (result.success) {
             device.status = DeviceStatus.ONLINE; // assuming online after unlock
             await device.save();
          }
          break;
        case 'WIPE':
          result = await this.deviceProvider.wipeDevice(device.fleetHostId);
          if (result.success) {
            device.status = DeviceStatus.WIPED;
            await device.save();
          }
          break;
        default:
          throw new Error('Unknown action type');
      }

      // 3. Update audit log success
      audit.status = ActionStatus.SUCCESS;
      audit.executedAt = new Date();
      audit.responseDetails = result;
      await audit.save();

      return result;
    } catch (error) {
      // 4. Update audit log failure
      audit.status = ActionStatus.FAILED;
      audit.responseDetails = { error: error.message };
      await audit.save();
      throw error;
    }
  }

  async getDeviceLocation(id: string): Promise<any> {
    const device = await this.findOne(id);
    if (!device.fleetHostId) {
      throw new Error('Device does not have a provider ID linked');
    }
    return this.deviceProvider.getDeviceLocation(device.fleetHostId);
  }

  async getDeviceStatus(id: string): Promise<any> {
    const device = await this.findOne(id);
    if (!device.fleetHostId) {
      throw new Error('Device does not have a provider ID linked');
    }
    return this.deviceProvider.getDeviceStatus(device.fleetHostId);
  }
}
