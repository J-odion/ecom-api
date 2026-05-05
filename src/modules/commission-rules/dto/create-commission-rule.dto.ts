export class CreateCommissionRuleDto {
  ruleType: string;
  amountType: string;
  value: number;
  productId?: string;
  minQuantity?: number;
}
