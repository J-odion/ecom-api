export class CreateLeadDto {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  productId: string;
  quantity: number;
  sourceMediaBuyerId?: string;
}
