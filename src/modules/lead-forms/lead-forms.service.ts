import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LeadForm, LeadFormDocument } from './schemas/lead-form.schema';
import { CreateLeadFormDto } from './dto/create-lead-form.dto';
import { ConfigService } from '@nestjs/config';
import { Lead, LeadDocument } from '../leads/schemas/lead.schema';
import { Order, OrderDocument, OrderStatus } from '../orders/schemas/order.schema';

@Injectable()
export class LeadFormsService {
  private readonly logger = new Logger(LeadFormsService.name);

  constructor(
    @InjectModel(LeadForm.name) private leadFormModel: Model<LeadFormDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateLeadFormDto): Promise<LeadForm> {
    const form = new this.leadFormModel({
      ...dto,
      productId: new Types.ObjectId(dto.productId),
      sourceMediaBuyerId: dto.sourceMediaBuyerId ? new Types.ObjectId(dto.sourceMediaBuyerId) : null,
    });
    return form.save();
  }

  async calculateFormEarnings(formId: string): Promise<number> {
    const leads = await this.leadModel.find({ leadFormId: new Types.ObjectId(formId) }).select('_id').exec();
    if (!leads || leads.length === 0) return 0;
    const leadIds = leads.map(l => l._id);

    const orders = await this.orderModel.find({
      leadId: { $in: leadIds },
      status: OrderStatus.CASH_REMITTED,
    }).select('totalAmount').exec();

    return orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  }

  async findAll() {
    const forms = await this.leadFormModel.find().populate('productId').populate('sourceMediaBuyerId').lean().exec();
    const results = [];
    for (const form of forms) {
      const earnings = await this.calculateFormEarnings((form as any)._id.toString());
      results.push({ ...form, earnings });
    }
    return results;
  }

  async findOne(id: string) {
    const form = await this.leadFormModel.findById(id).populate('productId').populate('sourceMediaBuyerId').lean().exec();
    if (!form) throw new NotFoundException('Lead form not found.');
    const earnings = await this.calculateFormEarnings(id);
    return { ...form, earnings };
  }

  async update(id: string, dto: Partial<CreateLeadFormDto>): Promise<LeadForm> {
    const form = await this.leadFormModel.findByIdAndUpdate(id, dto, { new: true });
    if (!form) throw new NotFoundException('Lead form not found.');
    return form;
  }

  async remove(id: string): Promise<void> {
    await this.leadFormModel.findByIdAndDelete(id);
  }

  generateFormHtml(form: LeadFormDocument, apiBaseUrl: string): string {
    const formId = form._id.toString();
    const productId = form.productId.toString();
    const mediaBuyerId = form.sourceMediaBuyerId ? form.sourceMediaBuyerId.toString() : '';
    const primaryColor = form.primaryColor || '#4F46E5';
    const submitText = form.submitButtonText || 'Submit';
    const successMsg = form.successMessage || '✅ Thank you! We will be in touch shortly.';
    const addressField = form.showAddressField !== false;
    const quantityField = form.showQuantityField === true;
    
    const partialUrl = `${apiBaseUrl}/leads/partial`;
    const webhookUrl = `${apiBaseUrl}/leads/webhook`;

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
    .save-indicator {
      position: absolute; right: 12px; top: 34px; font-size: 0.75rem; color: #10b981;
      display: none; align-items: center; pointer-events: none;
    }
    .save-indicator.active { display: flex; }
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
    <form id="leadForm" novalidate>
      <div class="field">
        <label for="customerPhone">Phone Number *</label>
        <input type="tel" id="customerPhone" name="customerPhone" placeholder="08012345678" />
        <div class="save-indicator" id="save-phone">✔ Progress saved</div>
        <div class="error" id="phoneErr">Please enter a valid phone number.</div>
      </div>
      <div class="field">
        <label for="customerName">Full Name *</label>
        <input type="text" id="customerName" name="customerName" placeholder="John Doe" />
        <div class="save-indicator" id="save-name">✔ Progress saved</div>
        <div class="error" id="nameErr">Letters and spaces only.</div>
      </div>
      ${addressField ? `
      <div class="field">
        <label for="customerAddress">Delivery Address</label>
        <input type="text" id="customerAddress" name="customerAddress" placeholder="e.g. 12 Street, Lagos" />
        <div class="save-indicator" id="save-addr">✔ Progress saved</div>
      </div>` : ''}
      ${quantityField ? `
      <div class="field">
        <label for="quantity">Quantity</label>
        <input type="number" id="quantity" name="quantity" value="1" min="1" />
      </div>` : ''}
      <input type="hidden" id="productId" name="productId" value="${productId}" />
      <input type="hidden" id="leadFormId" name="leadFormId" value="${formId}" />
      <input type="hidden" id="sourceMediaBuyerId" name="sourceMediaBuyerId" value="${mediaBuyerId}" />
      <input type="hidden" id="source" name="source" value="${form.defaultSource || 'OTHER'}" />
      <button type="submit" id="submitBtn">${submitText}</button>
    </form>
  </div>

  <script>
    const nameRx = /^[a-zA-Z\\s'\\-]{2,}$/;
    const phoneRx = /^(\\+?[0-9]{7,15})$/;
    let saveTimeout = null;

    async function sendPartial() {
      const phone = document.getElementById('customerPhone').value.trim().replace(/\\s/g,'');
      if (!phoneRx.test(phone)) return;

      const payload = {
        customerPhone: phone,
        customerName: document.getElementById('customerName').value.trim() || undefined,
        customerAddress: document.getElementById('customerAddress')?.value.trim() || undefined,
        productId: document.getElementById('productId').value,
        quantity: ${quantityField ? 'parseInt(document.getElementById("quantity").value)' : '1'},
        leadFormId: document.getElementById('leadFormId')?.value || undefined,
      };

      try {
        await fetch('${partialUrl}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        // Show indicator briefly for the focused field
        const activeField = document.activeElement;
        if (activeField && activeField.id) {
          const indicator = document.getElementById('save-' + activeField.id.replace('customer', '').toLowerCase().substring(0,4).trim());
          if (indicator) {
            indicator.classList.add('active');
            setTimeout(() => indicator.classList.remove('active'), 2000);
          }
        }
      } catch (err) {}
    }

    // Event listeners for progressive capture
    ['customerPhone', 'customerName', 'customerAddress'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(sendPartial, 1500); // Save after 1.5s of typing pause
      });
      el.addEventListener('blur', sendPartial); // Save when user leaves the field
    });

    document.getElementById('leadForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      let valid = true;

      const name = document.getElementById('customerName');
      const nameErr = document.getElementById('nameErr');
      if (!nameRx.test(name.value.trim())) { name.style.borderColor = '#ef4444'; nameErr.style.display = 'block'; valid = false; }
      else { name.style.borderColor = ''; nameErr.style.display = 'none'; }

      const phone = document.getElementById('customerPhone');
      const phoneErr = document.getElementById('phoneErr');
      if (!phoneRx.test(phone.value.trim().replace(/\\s/g,''))) { phone.style.borderColor = '#ef4444'; phoneErr.style.display = 'block'; valid = false; }
      else { phone.style.borderColor = ''; phoneErr.style.display = 'none'; }

      if (!valid) return;

      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Submitting...';

      const payload = {
        customerName: name.value.trim(),
        customerPhone: phone.value.trim().replace(/\\s/g,''),
        customerAddress: document.getElementById('customerAddress')?.value.trim(),
        productId: document.getElementById('productId').value,
        quantity: ${quantityField ? 'parseInt(document.getElementById("quantity").value)' : '1'},
        sourceMediaBuyerId: document.getElementById('sourceMediaBuyerId').value || undefined,
        source: document.getElementById('source').value,
        leadFormId: document.getElementById('leadFormId')?.value || undefined,
      };

      try {
        const res = await fetch('${webhookUrl}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          document.getElementById('leadForm').style.display = 'none';
          document.getElementById('successMsg').style.display = 'block';
        } else {
          const data = await res.json();
          btn.disabled = false;
          btn.innerHTML = '${submitText}';
          alert(data.message || 'Error occurred.');
        }
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '${submitText}';
        alert('Network error.');
      }
    });
  </script>
</body>
</html>`;
  }

  getIframeCode(formId: string, apiBaseUrl: string): string {
    return `<iframe src="${apiBaseUrl}/lead-forms/${formId}/embed" width="100%" height="600" frameborder="0" style="border:none; border-radius:16px;" title="Lead Capture Form"></iframe>`;
  }
}
