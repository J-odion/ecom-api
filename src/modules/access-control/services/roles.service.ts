import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from '../schemas/role.schema';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    try {
      const role = new this.roleModel(createRoleDto);
      return await role.save();
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('Role name already exists within this department');
      }
      throw err;
    }
  }

  async findAll() {
    return this.roleModel.find().populate('department').exec();
  }

  async findOne(id: string) {
    const role = await this.roleModel.findById(id).populate('department').exec();
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.roleModel.findById(id);
    if (!role) throw new NotFoundException('Role not found');

    if (role.isSystemRole) {
      throw new ForbiddenException('Cannot edit a system role');
    }

    if (updateRoleDto.name) role.name = updateRoleDto.name;
    if (updateRoleDto.description !== undefined) role.description = updateRoleDto.description;
    if (updateRoleDto.department !== undefined) role.department = updateRoleDto.department as any;
    
    if (updateRoleDto.permissions !== undefined) {
      role.permissions = updateRoleDto.permissions;
      role.version += 1; // Bump version for cache busting
    }

    try {
      return await role.save();
    } catch (err: any) {
      if (err.code === 11000) throw new ConflictException('Role name already exists within this department');
      throw err;
    }
  }

  async remove(id: string) {
    const role = await this.roleModel.findById(id);
    if (!role) throw new NotFoundException('Role not found');

    if (role.isSystemRole) {
      throw new ForbiddenException('Cannot delete a system role');
    }

    const count = await this.userModel.countDocuments({ role: id });
    if (count > 0) {
      throw new ConflictException(`Cannot delete role. ${count} users are currently assigned to it.`);
    }

    await this.roleModel.findByIdAndDelete(id);
    return { deleted: true };
  }
}
