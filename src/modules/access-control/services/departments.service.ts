import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department, DepartmentDocument } from '../schemas/department.schema';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name) private deptModel: Model<DepartmentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    try {
      const dept = new this.deptModel(createDepartmentDto);
      return await dept.save();
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('Department name already exists');
      }
      throw err;
    }
  }

  async findAll() {
    return this.deptModel.find().exec();
  }

  async findOne(id: string) {
    const dept = await this.deptModel.findById(id).exec();
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    const dept = await this.deptModel.findById(id);
    if (!dept) throw new NotFoundException('Department not found');

    if (updateDepartmentDto.name) dept.name = updateDepartmentDto.name;
    if (updateDepartmentDto.description !== undefined) dept.description = updateDepartmentDto.description;
    if (updateDepartmentDto.defaultPermissions !== undefined) {
      dept.defaultPermissions = updateDepartmentDto.defaultPermissions;
      dept.version += 1;
    }

    try {
      return await dept.save();
    } catch (err: any) {
      if (err.code === 11000) throw new ConflictException('Department name already exists');
      throw err;
    }
  }

  async remove(id: string) {
    const count = await this.userModel.countDocuments({ department: id });
    if (count > 0) {
      throw new ConflictException(`Cannot delete department. ${count} users are currently assigned to it.`);
    }
    const result = await this.deptModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Department not found');
    return { deleted: true };
  }
}
