import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommissionRulesController } from './commission-rules.controller';
import { CommissionRulesService } from './commission-rules.service';
import { CommissionRule, CommissionRuleSchema } from './schemas/commission-rule.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CommissionRule.name, schema: CommissionRuleSchema }]),
  ],
  controllers: [CommissionRulesController],
  providers: [CommissionRulesService],
  exports: [CommissionRulesService],
})
export class CommissionRulesModule {}
