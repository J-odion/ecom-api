import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CommissionRule, CommissionRuleDocument, RuleType, AmountType } from './schemas/commission-rule.schema';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';

@Injectable()
export class CommissionRulesService {
  constructor(
    @InjectModel(CommissionRule.name) private ruleModel: Model<CommissionRuleDocument>,
  ) {}

  async create(createDto: CreateCommissionRuleDto): Promise<CommissionRule> {
    const payload: any = { ...createDto };
    if (createDto.productId) {
      payload.productId = new Types.ObjectId(createDto.productId);
    }
    const rule = new this.ruleModel(payload);
    return rule.save();
  }

  async findAll(): Promise<CommissionRule[]> {
    return this.ruleModel.find().exec();
  }

  async calculateCommission(productId: string, qty: number, totalAmount: number): Promise<number> {
    // 1. Check Quantity-based rules first (highest priority if applicable)
    let rule = await this.ruleModel.findOne({ 
      ruleType: RuleType.QUANTITY, 
      isActive: true,
      productId: new Types.ObjectId(productId),
      minQuantity: { $lte: qty }
    }).sort({ minQuantity: -1 }).exec();

    // 2. Fallback to Product-specific rules
    if (!rule) {
      rule = await this.ruleModel.findOne({
        ruleType: RuleType.PRODUCT,
        isActive: true,
        productId: new Types.ObjectId(productId)
      }).exec();
    }

    // 3. Fallback to Global rules
    if (!rule) {
      rule = await this.ruleModel.findOne({
        ruleType: RuleType.GLOBAL,
        isActive: true
      }).exec();
    }

    if (!rule) {
      return 0; // Default if no rules set
    }

    if (rule.amountType === AmountType.FLAT) {
      return rule.value * qty; // Flat rate per item or flat rate total? Let's say flat rate per item.
    } else {
      return (totalAmount * rule.value) / 100;
    }
  }
}
