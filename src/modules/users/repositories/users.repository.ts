import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: Partial<User>) {
    return this.userModel.create(data);
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).populate('locationId').exec();
  }

  async findById(id: string) {
    return this.userModel.findById(id).populate('locationId').exec();
  }

  async findByRole(role: string) {
    return this.userModel.find({ role, isActive: true }).populate('locationId').exec();
  }

  async findAll() {
    return this.userModel.find().populate('locationId').exec();
  }

  async update(id: string, data: Partial<User>) {
    // Fixed deprecated 'new' option for Mongoose
    return this.userModel.findByIdAndUpdate(id, data, { returnDocument: 'after' }).exec();
  }
}