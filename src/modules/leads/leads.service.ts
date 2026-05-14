import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument, LeadEntryType, LeadStatus } from './schemas/lead.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { UsersService } from '../users/users.service';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Capture data incrementally as the user types (Partial Submission).
   */
  async createPartial(createLeadDto: Partial<CreateLeadDto>): Promise<Lead | null> {
    const phone = createLeadDto.customerPhone;
    if (!phone) return null;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const lead = await this.leadModel.findOne({
      customerPhone: phone,
      status: LeadStatus.PARTIAL,
      updatedAt: { $gte: oneHourAgo }
    });

    if (lead) {
      return this.leadModel.findByIdAndUpdate(lead._id, { ...createLeadDto }, { new: true }).exec();
    } else {
      const newLead = new this.leadModel({
        ...createLeadDto,
        customerName: createLeadDto.customerName || 'Anonymous',
        status: LeadStatus.PARTIAL,
        entryType: LeadEntryType.FORM,
        productId: createLeadDto.productId ? new Types.ObjectId(createLeadDto.productId) : undefined,
        quantity: createLeadDto.quantity || 1,
      });
      return newLead.save();
    }
  }

  async createFromWebhook(createLeadDto: CreateLeadDto): Promise<Lead> {
    return this.processIdentityAndSave(createLeadDto, LeadEntryType.FORM);
  }

  async createManual(createLeadDto: CreateLeadDto): Promise<Lead> {
    return this.processIdentityAndSave(createLeadDto, LeadEntryType.MANUAL);
  }

  private async processIdentityAndSave(dto: CreateLeadDto, entryType: LeadEntryType): Promise<Lead> {
    const phone = dto.customerPhone;
    
    const previousOrder = await this.orderModel.findOne({ customerPhone: phone }).sort({ createdAt: -1 });
    const isReturning = !!previousOrder;

    const previousLeads = await this.leadModel.find({ customerPhone: phone, status: { $ne: LeadStatus.PARTIAL } }).sort({ createdAt: -1 });
    const isDuplicate = previousLeads.length > 0;
    const submissionCount = previousLeads.length + 1;
    const relatedLeadIds = previousLeads.map(l => l._id as Types.ObjectId);

    let assignedToId: Types.ObjectId | null = null;
    if (previousOrder?.agentId) {
      assignedToId = previousOrder.agentId;
    } else if (previousLeads.length > 0 && previousLeads[0].assignedTo) {
      assignedToId = previousLeads[0].assignedTo;
    } else {
      assignedToId = await this.getLowestLoadAgent();
    }

    const existingPartial = await this.leadModel.findOne({ 
      customerPhone: phone, 
      status: LeadStatus.PARTIAL 
    });

    if (existingPartial) {
      const updated = await this.leadModel.findByIdAndUpdate(existingPartial._id, {
        ...dto,
        productId: new Types.ObjectId(dto.productId),
        sourceMediaBuyerId: dto.sourceMediaBuyerId ? new Types.ObjectId(dto.sourceMediaBuyerId) : null,
        status: LeadStatus.NEW,
        entryType,
        isDuplicate,
        isReturning,
        submissionCount,
        relatedLeadIds,
        assignedTo: assignedToId,
      }, { new: true }).exec();
      return updated!;
    }

    const newLead = new this.leadModel({
      ...dto,
      productId: new Types.ObjectId(dto.productId),
      sourceMediaBuyerId: dto.sourceMediaBuyerId ? new Types.ObjectId(dto.sourceMediaBuyerId) : null,
      status: LeadStatus.NEW,
      entryType,
      isDuplicate,
      isReturning,
      submissionCount,
      relatedLeadIds,
      assignedTo: assignedToId,
    });

    return newLead.save();
  }

  private async getLowestLoadAgent(): Promise<Types.ObjectId | null> {
    try {
      const agents = await this.usersService.findByRole(Role.CUSTOMER_SERVICE);
      if (!agents || agents.length === 0) return null;

      const counts = await this.leadModel.aggregate([
        { $match: { status: { $in: [LeadStatus.NEW, LeadStatus.CONTACTED] }, assignedTo: { $ne: null } } },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      ]);

      const countMap = new Map(counts.map(c => [c._id.toString(), c.count]));
      
      let bestAgent = agents[0];
      let lowest = countMap.get(agents[0]._id.toString()) || 0;

      for (const agent of agents) {
        const count = countMap.get(agent._id.toString()) || 0;
        if (count < lowest) {
          lowest = count;
          bestAgent = agent;
        }
      }
      return new Types.ObjectId(bestAgent._id.toString());
    } catch {
      return null;
    }
  }

  async findAll(query: any): Promise<Lead[]> {
    const filter: any = {};
    if (query.assignedTo) filter.assignedTo = new Types.ObjectId(query.assignedTo);
    if (query.source) filter.source = query.source;
    if (query.status) filter.status = query.status;
    if (query.isDuplicate === 'true') filter.isDuplicate = true;
    if (query.isReturning === 'true') filter.isReturning = true;

    return this.leadModel.find(filter)
      .populate('productId')
      .populate('assignedTo')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadModel.findById(id).populate('productId').populate('assignedTo').exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async assign(id: string, dto: AssignLeadDto): Promise<Lead> {
    const updated = await this.leadModel.findByIdAndUpdate(id, { assignedTo: new Types.ObjectId(dto.assignedTo) }, { new: true }).exec();
    if (!updated) throw new NotFoundException('Lead not found');
    return updated;
  }

  async updateStatus(id: string, status: LeadStatus): Promise<Lead> {
    const updated = await this.leadModel.findByIdAndUpdate(id, { status }, { new: true }).exec();
    if (!updated) throw new NotFoundException('Lead not found');
    return updated;
  }
}
