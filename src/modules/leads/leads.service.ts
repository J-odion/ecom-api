import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { UsersService } from '../users/users.service';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(createLeadDto: CreateLeadDto): Promise<Lead> {
    // Basic auto-assignment (load balancing placeholder)
    let assignedToId: Types.ObjectId | null = null;
    try {
      const csAgents = await this.usersService.findByRole(Role.CUSTOMER_SERVICE);
      if (csAgents && csAgents.length > 0) {
        // Pick a random agent or based on performance. For now, random/round-robin approximation.
        // In a full implementation, we'd query performance metrics or lowest lead count.
        const randomIndex = Math.floor(Math.random() * csAgents.length);
        assignedToId = csAgents[randomIndex]._id;
      }
    } catch (err) {
      // Ignore assignment error and leave it unassigned if no CS agents found
    }

    const createdLead = new this.leadModel({
      ...createLeadDto,
      productId: new Types.ObjectId(createLeadDto.productId),
      sourceMediaBuyerId: createLeadDto.sourceMediaBuyerId ? new Types.ObjectId(createLeadDto.sourceMediaBuyerId) : null,
      assignedTo: assignedToId ? new Types.ObjectId(assignedToId.toString()) : null,
    });
    return createdLead.save();
  }

  async findAll(assignedTo?: string): Promise<Lead[]> {
    const filter = assignedTo ? { assignedTo: new Types.ObjectId(assignedTo) } : {};
    return this.leadModel.find(filter).populate('productId').exec();
  }

  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadModel.findById(id).populate('productId').exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async assign(id: string, assignLeadDto: AssignLeadDto): Promise<Lead> {
    const lead = await this.leadModel.findByIdAndUpdate(
      id,
      { assignedTo: new Types.ObjectId(assignLeadDto.assignedTo) },
      { new: true }
    ).exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async updateStatus(id: string, status: string): Promise<Lead> {
    const lead = await this.leadModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}
