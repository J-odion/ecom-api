import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Location, LocationDocument } from './schemas/location.schema';

@Injectable()
export class LocationsService {
  constructor(@InjectModel(Location.name) private locationModel: Model<LocationDocument>) {}

  async create(name: string, address?: string): Promise<Location> {
    const location = new this.locationModel({ name, address });
    return location.save();
  }

  async findAll(): Promise<Location[]> {
    return this.locationModel.find({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<Location | null> {
    return this.locationModel.findById(id).exec();
  }
}
