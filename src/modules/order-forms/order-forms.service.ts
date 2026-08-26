import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderForm, OrderFormDocument } from './schemas/order-form.schema';
import { CreateOrderFormDto } from './dto/create-order-form.dto';
import { ConfigService } from '@nestjs/config';
import { Order, OrderDocument, OrderStatus } from '../orders/schemas/order.schema';
import { OrderActivityService } from '../orders/order-activity.service';
import { ActivityAction, ActivityCategory, ActivitySource } from '../orders/schemas/order-activity.schema';

@Injectable()
export class OrderFormsService {
  private readonly logger = new Logger(OrderFormsService.name);

  constructor(
    @InjectModel(OrderForm.name) private OrderFormModel: Model<OrderFormDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly configService: ConfigService,
    private readonly activityService: OrderActivityService,
  ) {}

  async create(dto: CreateOrderFormDto): Promise<OrderForm> {
    const form = new this.OrderFormModel({
      ...dto,
      productId: new Types.ObjectId(dto.productId),
      sourceMediaBuyerId: dto.sourceMediaBuyerId ? new Types.ObjectId(dto.sourceMediaBuyerId) : null,
      bumpProduct: dto.bumpProduct ? new Types.ObjectId(dto.bumpProduct) : undefined,
      upsellProduct: dto.upsellProduct ? new Types.ObjectId(dto.upsellProduct) : undefined,
    });
    return form.save();
  }

  async calculateFormMetrics(formId: string): Promise<{ earnings: number, orderCount: number }> {
    const orders = await this.orderModel.find({ orderFormId: new Types.ObjectId(formId) }).select('totalAmount status').exec();
    
    let earnings = 0;
    
    for (const o of orders) {
       if (o.status === OrderStatus.CASH_REMITTED) {
          earnings += (o.totalAmount || 0);
       }
    }

    return { earnings, orderCount: orders.length };
  }

  async findAll() {
    const forms = await this.OrderFormModel.find().populate('productId').populate('sourceMediaBuyerId').lean().exec();
    const results: any[] = [];
    for (const form of forms) {
      const metrics = await this.calculateFormMetrics((form as any)._id.toString());
      results.push({ ...form, ...metrics });
    }
    return results;
  }

  async findOne(id: string) {
    const form = await this.OrderFormModel.findById(id).populate('productId').populate('sourceMediaBuyerId').lean().exec();
    if (!form) throw new NotFoundException('Order form not found.');
    const metrics = await this.calculateFormMetrics(id);
    return { ...form, ...metrics };
  }

  async update(id: string, dto: Partial<CreateOrderFormDto>): Promise<OrderForm> {
    const form = await this.OrderFormModel.findByIdAndUpdate(id, dto, { new: true });
    if (!form) throw new NotFoundException('Order form not found.');
    return form;
  }

  async remove(id: string): Promise<void> {
    await this.OrderFormModel.findByIdAndDelete(id);
  }

  generateFormHtml(form: OrderFormDocument, apiBaseUrl: string): string {
    const formId = form._id.toString();
    const productId = form.productId.toString();
    const mediaBuyerId = form.sourceMediaBuyerId ? form.sourceMediaBuyerId.toString() : '';
    const primaryColor = form.primaryColor || '#4F46E5';
    const submitText = form.submitButtonText || 'Submit';
    const successMsg = form.successMessage || '✅ Thank you! We will be in touch shortly.';
    const addressField = form.showAddressField !== false;
    const quantityField = form.showQuantityField === true;
    
    // Webhook url for saving the order (pending or abandoned)
    const webhookUrl = `${apiBaseUrl}/order-forms/webhook`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${form.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f8fafc; padding: 24px; }
    .form-card {
      max-width: 480px; margin: 0 auto;
      background: white; border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06); padding: 32px;
    }
    h2 { font-size: 1.4rem; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
    p.desc { font-size: 0.9rem; color: #64748b; margin-bottom: 24px; }
    .field { margin-bottom: 20px; position: relative; }
    label { display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 6px; }
    input, select, textarea {
      width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0;
      border-radius: 10px; font-size: 0.95rem; color: #1e293b;
      outline: none; transition: all 0.2s;
    }
    input:focus { border-color: ${primaryColor}; box-shadow: 0 0 0 3px ${primaryColor}20; }
    .error { font-size: 0.78rem; color: #ef4444; margin-top: 4px; display: none; }
    button[type=submit] {
      width: 100%; padding: 14px;
      background: ${primaryColor}; color: white;
      border: none; border-radius: 10px;
      font-size: 1rem; font-weight: 600; cursor: pointer;
      transition: all 0.2s;
      margin-top: 8px;
    }
    button[type=submit]:hover { filter: brightness(1.1); transform: translateY(-1px); }
    button[type=submit]:active { transform: translateY(0); }
    button[type=submit]:disabled { opacity: 0.6; cursor: not-allowed; }
    .success-msg {
      display: none; background: #f0fdf4; border: 1.5px solid #86efac;
      color: #166534; padding: 20px; border-radius: 12px;
      font-size: 1rem; font-weight: 500; text-align: center;
    }
    .spinner { display: inline-block; width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="form-card">
    <h2>${form.title}</h2>
    ${form.description ? `<p class="desc">${form.description}</p>` : ''}
    <div class="success-msg" id="successMsg">${successMsg}</div>
    <form id="OrderForm" novalidate>
      <div class="field">
        <label for="customerName">Full Name *</label>
        <input type="text" id="customerName" name="customerName" placeholder="John Doe" />
        <div class="error" id="nameErr">Letters and spaces only.</div>
      </div>
      <div class="field">
        <label for="callNumber">Phone Number (Call) *</label>
        <input type="tel" id="callNumber" name="callNumber" placeholder="08012345678" />
        <div class="error" id="callErr">Please enter a valid phone number.</div>
      </div>
      <div class="field">
        <label for="whatsappNumber">WhatsApp Number</label>
        <input type="tel" id="whatsappNumber" name="whatsappNumber" placeholder="08012345678" />
      </div>
      <div class="field">
        <label for="customerEmail">Email Address</label>
        <input type="email" id="customerEmail" name="customerEmail" placeholder="email@example.com" />
      </div>
      ${addressField ? `
      <div class="field">
        <label for="customerAddress">Delivery Address</label>
        <input type="text" id="customerAddress" name="customerAddress" placeholder="e.g. 12 Street, Lagos" />
      </div>` : ''}
      ${quantityField ? `
      <div class="field">
        <label for="quantity">Quantity</label>
        <input type="number" id="quantity" name="quantity" value="1" min="1" />
      </div>` : ''}
      
      <input type="hidden" id="productId" name="productId" value="${productId}" />
      <input type="hidden" id="orderFormId" name="orderFormId" value="${formId}" />
      <input type="hidden" id="sourceMediaBuyerId" name="sourceMediaBuyerId" value="${mediaBuyerId}" />
      <input type="hidden" id="source" name="source" value="${form.defaultSource || 'OTHER'}" />
      <button type="submit" id="submitBtn">${submitText}</button>
    </form>
  </div>

  <script>
    const nameRx = /^[a-zA-Z\\s'\\-]{2,}$/;
    const phoneRx = /^(\\+?[0-9]{7,15})$/;
    
    let isSubmitted = false;
    let idleTimeout = null;
    let hasSentAbandoned = false;
    let abandonedOrderId = null; // Store ID if backend returns it to update later

    function resetIdleTimer() {
      if (isSubmitted) return;
      clearTimeout(idleTimeout);
      // 10 minutes = 600000 ms
      idleTimeout = setTimeout(() => {
        triggerAbandonment();
      }, 600000);
    }

    // Reset idle timer on user activity
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keypress', resetIdleTimer);
    window.addEventListener('scroll', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    
    resetIdleTimer();

    // Trigger on page close
    window.addEventListener('beforeunload', (e) => {
      if (!isSubmitted) {
        triggerAbandonment(true);
      }
    });

    function getPayload(status) {
      return {
        customerName: document.getElementById('customerName').value.trim() || undefined,
        callNumber: document.getElementById('callNumber').value.trim().replace(/\\s/g,'') || undefined,
        whatsappNumber: document.getElementById('whatsappNumber').value.trim().replace(/\\s/g,'') || undefined,
        customerEmail: document.getElementById('customerEmail').value.trim() || undefined,
        customerAddress: document.getElementById('customerAddress')?.value.trim() || undefined,
        productId: document.getElementById('productId').value,
        quantity: ${quantityField ? 'parseInt(document.getElementById("quantity").value)' : '1'},
        sourceMediaBuyerId: document.getElementById('sourceMediaBuyerId').value || undefined,
        source: document.getElementById('source').value,
        orderFormId: document.getElementById('orderFormId').value || undefined,
        status: status,
        orderId: abandonedOrderId // Used if we are updating an existing abandoned cart
      };
    }

    function triggerAbandonment(isBeacon = false) {
      if (isSubmitted) return;
      
      const payload = getPayload('ABANDONED');
      
      // Validation: Abandoned data is only sent if name AND (phone OR email) are entered
      if (!payload.customerName) return;
      if (!payload.callNumber && !payload.whatsappNumber && !payload.customerEmail) return;

      if (isBeacon && navigator.sendBeacon) {
        // Use sendBeacon for beforeunload to ensure it sends
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('${webhookUrl}', blob);
        hasSentAbandoned = true;
      } else {
        // Standard fetch for idle timeout
        fetch('${webhookUrl}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(res => res.json()).then(data => {
          if (data && data.orderId) {
             abandonedOrderId = data.orderId;
          }
        }).catch(err => console.error(err));
        hasSentAbandoned = true;
      }
    }

    document.getElementById('OrderForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      let valid = true;

      const name = document.getElementById('customerName');
      const nameErr = document.getElementById('nameErr');
      if (!nameRx.test(name.value.trim())) { name.style.borderColor = '#ef4444'; nameErr.style.display = 'block'; valid = false; }
      else { name.style.borderColor = ''; nameErr.style.display = 'none'; }

      const callNum = document.getElementById('callNumber');
      const callErr = document.getElementById('callErr');
      if (!phoneRx.test(callNum.value.trim().replace(/\\s/g,''))) { callNum.style.borderColor = '#ef4444'; callErr.style.display = 'block'; valid = false; }
      else { callNum.style.borderColor = ''; callErr.style.display = 'none'; }

      if (!valid) return;

      isSubmitted = true;
      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Submitting...';

      const payload = getPayload('PENDING');

      try {
        const res = await fetch('${webhookUrl}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          document.getElementById('OrderForm').style.display = 'none';
          document.getElementById('successMsg').style.display = 'block';
        } else {
          const data = await res.json();
          btn.disabled = false;
          btn.innerHTML = '${submitText}';
          alert(data.message || 'Error occurred.');
          isSubmitted = false;
        }
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '${submitText}';
        alert('Network error.');
        isSubmitted = false;
      }
    });
  </script>
</body>
</html>`;
  }

  getIframeCode(formId: string, apiBaseUrl: string): string {
    return `<iframe src="${apiBaseUrl}/order-forms/${formId}/embed" width="100%" height="600" frameborder="0" style="border:none; border-radius:16px;" title="Order Capture Form"></iframe>`;
  }

  async processWebhook(payload: any) {
    const {
      customerName, callNumber, whatsappNumber, customerEmail,
      customerAddress, productId, quantity, sourceMediaBuyerId,
      source, orderFormId, status, orderId
    } = payload;

    const items: any[] = [];
    if (productId) {
      // Typically you'd look up the product to get the true unitPrice, 
      // but for webhook we'll just set it to 0 or fetch it.
      items.push({
        productId: new Types.ObjectId(productId),
        qty: quantity || 1,
        unitPrice: 0 // Will need to be updated by a worker or during processing
      });
    }

    const orderData = {
      customerName: customerName || 'Unknown',
      callNumber: callNumber || '',
      whatsappNumber,
      customerEmail,
      customerAddress,
      customerPhone: callNumber || whatsappNumber || 'Unknown', // legacy field fallback
      items,
      totalAmount: 0,
      status: status || OrderStatus.PENDING,
      orderFormId: orderFormId ? new Types.ObjectId(orderFormId) : undefined,
      sourceMediaBuyerId: sourceMediaBuyerId ? new Types.ObjectId(sourceMediaBuyerId) : undefined,
      source: source || 'OTHER',
      entryType: 'FORM'
    };

    if (orderId) {
      const existing = await this.orderModel.findById(orderId).exec();
      if (existing) {
        if (existing.status === OrderStatus.ABANDONED || status === OrderStatus.PENDING) {
           Object.assign(existing, orderData);
           await existing.save();
        }
        return { success: true, orderId: existing._id };
      }
    }

    const newOrder = new this.orderModel(orderData);
    await newOrder.save();

    // Log form submission or cart abandonment activity
    const isAbandoned = (status || OrderStatus.PENDING) === OrderStatus.ABANDONED;
    await this.activityService.log({
      orderId: newOrder._id.toString(),
      actorId: null,
      actorName: 'System',
      category: isAbandoned ? ActivityCategory.STATUS : ActivityCategory.CREATED,
      action: isAbandoned ? ActivityAction.CART_ABANDONED : ActivityAction.FORM_SUBMITTED,
      description: isAbandoned
        ? `Customer "${customerName || 'Unknown'}" started filling the form but did not submit — cart saved`
        : `Customer "${customerName || 'Unknown'}" submitted the order form`,
      newValue: isAbandoned ? OrderStatus.ABANDONED : OrderStatus.PENDING,
      metadata: {
        source: source || 'OTHER',
        orderFormId: orderFormId || null,
        phone: callNumber || whatsappNumber || null,
      },
      source: ActivitySource.WEBHOOK,
    });

    return { success: true, orderId: newOrder._id };
  }
}
