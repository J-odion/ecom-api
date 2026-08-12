import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DeviceAssignment, DeviceAssignmentDocument, AssignmentStatus } from '../schemas/device-assignment.schema';
import { Device, DeviceDocument } from '../schemas/device.schema';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectModel(DeviceAssignment.name) private assignmentModel: Model<DeviceAssignmentDocument>,
    @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
  ) {}

  async assignDevice(deviceId: string, userId: string, assignedBy: string, reason?: string): Promise<DeviceAssignment> {
    const device = await this.deviceModel.findById(deviceId);
    if (!device) throw new NotFoundException('Device not found');

    // End previous active assignments for this device
    await this.assignmentModel.updateMany(
      { deviceId: new Types.ObjectId(deviceId), status: AssignmentStatus.ACTIVE },
      { $set: { status: AssignmentStatus.ENDED, unassignedAt: new Date() } }
    );

    const assignment = new this.assignmentModel({
      deviceId: new Types.ObjectId(deviceId),
      userId: new Types.ObjectId(userId),
      assignedBy: new Types.ObjectId(assignedBy),
      reason,
      status: AssignmentStatus.ACTIVE,
      assignedAt: new Date(),
    });

    return assignment.save();
  }

  async unassignDevice(deviceId: string, userId?: string): Promise<void> {
    const filter: any = { deviceId: new Types.ObjectId(deviceId), status: AssignmentStatus.ACTIVE };
    if (userId) filter.userId = new Types.ObjectId(userId);

    const result = await this.assignmentModel.updateMany(
      filter,
      { $set: { status: AssignmentStatus.ENDED, unassignedAt: new Date() } }
    );

    if (result.modifiedCount === 0) {
      throw new BadRequestException('No active assignment found to unassign');
    }
  }

  async getAssignmentsForDevice(deviceId: string): Promise<DeviceAssignment[]> {
    return this.assignmentModel.find({ deviceId: new Types.ObjectId(deviceId) })
      .populate('userId', 'name email') // Assumes User schema has name/email
      .populate('assignedBy', 'name email')
      .sort({ assignedAt: -1 })
      .exec();
  }

  async getAssignmentsForUser(userId: string): Promise<DeviceAssignment[]> {
    return this.assignmentModel.find({ userId: new Types.ObjectId(userId) })
      .populate('deviceId')
      .sort({ assignedAt: -1 })
      .exec();
  }
}
