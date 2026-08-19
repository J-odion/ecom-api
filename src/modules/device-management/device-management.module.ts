import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { Device, DeviceSchema } from './schemas/device.schema';
import { DeviceAssignment, DeviceAssignmentSchema } from './schemas/device-assignment.schema';
import { DeviceAction, DeviceActionSchema } from './schemas/device-action.schema';

import { DEVICE_PROVIDER } from './providers/device-provider.interface';
import { FleetProvider } from './providers/fleet/fleet.provider';

import { DeviceService } from './services/device.service';
import { AssignmentService } from './services/assignment.service';
import { DeviceSyncWorker } from './services/device-sync.worker';

import { DevicesController } from './controllers/devices.controller';

import { UsersModule } from '../users/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Device.name, schema: DeviceSchema },
      { name: DeviceAssignment.name, schema: DeviceAssignmentSchema },
      { name: DeviceAction.name, schema: DeviceActionSchema },
    ]),
    ScheduleModule.forRoot(),
    UsersModule,
  ],
  controllers: [DevicesController],
  providers: [
    {
      provide: DEVICE_PROVIDER,
      useClass: FleetProvider,
    },
    DeviceService,
    AssignmentService,
    DeviceSyncWorker,
  ],
  exports: [DeviceService, AssignmentService],
})
export class DeviceManagementModule {}
