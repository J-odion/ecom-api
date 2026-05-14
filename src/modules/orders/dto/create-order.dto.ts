export class CreateOrderDto {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  agentId?: string;
  logisticsId?: string;
  items: { productId: string; qty: number; unitPrice: number }[];
  totalAmount: number;
  deliveryType?: string;
  leadId?: string;
  fulfillmentLocationId?: string;
  notes?: string;
}
