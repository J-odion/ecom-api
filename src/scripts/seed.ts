import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI environment variable is not defined.');
  process.exit(1);
}

async function seed() {
  console.log('🚀 Starting Comprehensive Seed v2 (All Modules)...');
  const connection = await mongoose.createConnection(MONGO_URI!).asPromise();
  
  // Clear existing data
  const collections = await connection.db!.listCollections().toArray();
  for (const coll of collections) {
    if (!coll.name.startsWith('system.')) {
      await connection.collection(coll.name).deleteMany({});
    }
  }
  console.log('✅ Cleared existing data.');

  const now = new Date();
  const password = await bcrypt.hash('password123', 10);

  // 1. LOCATIONS
  const locLagos = await connection.collection('locations').insertOne({ name: 'Lagos HQ', address: 'Ikeja, Lagos', isActive: true, createdAt: now, updatedAt: now });
  const locAbuja = await connection.collection('locations').insertOne({ name: 'Abuja Branch', address: 'Wuse 2, Abuja', isActive: true, createdAt: now, updatedAt: now });

  // 2. DEPARTMENTS & ROLES
  const deptAdmin = await connection.collection('departments').insertOne({ name: 'Administration', code: 'ADM', isActive: true, createdAt: now, updatedAt: now });
  const deptSales = await connection.collection('departments').insertOne({ name: 'Sales', code: 'SLS', isActive: true, createdAt: now, updatedAt: now });
  const deptLogistics = await connection.collection('departments').insertOne({ name: 'Logistics', code: 'LOG', isActive: true, createdAt: now, updatedAt: now });

  const roleAdmin = await connection.collection('roles').insertOne({ name: 'Super Admin', description: 'Full Access', permissions: [], isActive: true, isSystem: true, createdAt: now, updatedAt: now });
  const roleBuyer = await connection.collection('roles').insertOne({ name: 'Media Buyer', description: 'Marketing', permissions: [], isActive: true, isSystem: false, createdAt: now, updatedAt: now });
  const roleCS = await connection.collection('roles').insertOne({ name: 'Customer Service', description: 'Sales Agent', permissions: [], isActive: true, isSystem: false, createdAt: now, updatedAt: now });
  const roleLogistics = await connection.collection('roles').insertOne({ name: 'Logistics Rider', description: 'Delivery', permissions: [], isActive: true, isSystem: false, createdAt: now, updatedAt: now });

  // 3. USERS
  const admin = await connection.collection('users').insertOne({ email: 'admin@ecom.com', password, fullName: 'Main Admin', role: roleAdmin.insertedId, legacyRole: 'ADMIN', departmentId: deptAdmin.insertedId, isVerified: true, isActive: true, locationId: locLagos.insertedId, salary: 100000, createdAt: now, updatedAt: now });
  const buyer = await connection.collection('users').insertOne({ email: 'mike@ads.com', password, fullName: 'Mike Media', role: roleBuyer.insertedId, legacyRole: 'MEDIA_BUYER', departmentId: deptSales.insertedId, isVerified: true, isActive: true, locationId: locLagos.insertedId, salary: 50000, createdAt: now, updatedAt: now });
  const cs1 = await connection.collection('users').insertOne({ email: 'sarah@cs.com', password, fullName: 'Sarah CS', role: roleCS.insertedId, legacyRole: 'CUSTOMER_SERVICE', departmentId: deptSales.insertedId, isVerified: true, isActive: true, locationId: locLagos.insertedId, salary: 40000, createdAt: now, updatedAt: now });
  const rider = await connection.collection('users').insertOne({ email: 'john@rider.com', password, fullName: 'John Rider', role: roleLogistics.insertedId, legacyRole: 'LOGISTICS', departmentId: deptLogistics.insertedId, isVerified: true, isActive: true, locationId: locLagos.insertedId, salary: 30000, createdAt: now, updatedAt: now });

  // 4. PRODUCTS (No SKU, Stock directly on schema)
  const watch = await connection.collection('products').insertOne({ name: 'Luxury Gold Watch', description: 'Premium gold plated watch', baseCost: 15000, sellingPrice: 45000, stock: 100, reservedStock: 0, category: 'Accessories', isActive: true, createdAt: now, updatedAt: now });
  const wallet = await connection.collection('products').insertOne({ name: 'Leather Smart Wallet', description: 'RFID blocking leather wallet', baseCost: 5000, sellingPrice: 12000, stock: 50, reservedStock: 0, category: 'Accessories', isActive: true, createdAt: now, updatedAt: now });

  // 5. DEVICES (MDM) & ASSIGNMENTS
  const macbook = await connection.collection('devices').insertOne({ deviceIdentifier: 'MAC-1234', type: 'LAPTOP', os: 'MACOS', model: 'MacBook Pro M2', status: 'ACTIVE', batteryLevel: 100, location: { lat: 6.5244, lng: 3.3792 }, lastSeenAt: now, provider: 'JAMF', providerDeviceId: 'jamf-001', createdAt: now, updatedAt: now });
  const samsung = await connection.collection('devices').insertOne({ deviceIdentifier: 'SAM-5678', type: 'PHONE', os: 'ANDROID', model: 'Samsung Galaxy S22', status: 'ACTIVE', batteryLevel: 85, location: { lat: 6.5244, lng: 3.3792 }, lastSeenAt: now, provider: 'HEXNODE', providerDeviceId: 'hex-001', createdAt: now, updatedAt: now });

  await connection.collection('deviceassignments').insertMany([
    { deviceId: macbook.insertedId, userId: admin.insertedId, assignedById: admin.insertedId, assignedAt: now, status: 'ACTIVE', reason: 'Admin workstation', createdAt: now, updatedAt: now },
    { deviceId: samsung.insertedId, userId: rider.insertedId, assignedById: admin.insertedId, assignedAt: now, status: 'ACTIVE', reason: 'Rider dispatch phone', createdAt: now, updatedAt: now }
  ]);

  // 6. ORDER FORMS
  const watchForm = await connection.collection('orderforms').insertOne({
    title: 'Luxury Watch Campaign',
    description: 'Get 20% off today!',
    productId: watch.insertedId,
    sourceMediaBuyerId: buyer.insertedId,
    defaultSource: 'FACEBOOK',
    primaryColor: '#B48A30',
    submitButtonText: 'Claim Offer',
    successMessage: 'We will call you in 5 minutes!',
    showQuantityField: true,
    showAddressField: true,
    isActive: true,
    createdAt: now,
    updatedAt: now
  });

  // 7. ORDERS
  const deliveredOrder = await connection.collection('orders').insertOne({
    customerName: 'Diana Delivered', customerPhone: '08099900011', customerAddress: 'Wuse Abuja',
    agentId: cs1.insertedId, status: 'DELIVERED', totalAmount: 45000, deliveryFee: 2000,
    items: [{ productId: watch.insertedId, qty: 1, unitPrice: 45000 }],
    source: 'FACEBOOK', entryType: 'FORM', orderFormId: watchForm.insertedId,
    fulfillmentLocationId: locAbuja.insertedId, isDuplicate: false, isReturning: false, submissionCount: 1, 
    createdAt: new Date(Date.now() - 86400000), updatedAt: now
  });

  const scheduledOrder = await connection.collection('orders').insertOne({
    customerName: 'Charlie Return', customerPhone: '08077788899', customerAddress: 'Wuse Abuja',
    items: [{ productId: watch.insertedId, qty: 1, unitPrice: 45000 }], totalAmount: 45000,
    status: 'SCHEDULED', source: 'DIRECT', entryType: 'MANUAL', deliveryFee: 2000,
    agentId: cs1.insertedId, isDuplicate: false, isReturning: true, submissionCount: 1,
    fulfillmentLocationId: locAbuja.insertedId, 
    createdAt: now, updatedAt: now
  });

  // 8. LOGISTICS (DELIVERIES)
  await connection.collection('deliveries').insertOne({
    orderId: scheduledOrder.insertedId, deliveryAgentId: rider.insertedId, status: 'ASSIGNED', createdAt: now, updatedAt: now
  });

  // 9. COMMISSION RULES
  await connection.collection('commissionrules').insertOne({
    ruleType: 'PRODUCT', productId: watch.insertedId, amountType: 'FLAT', value: 2000, isActive: true, createdAt: now, updatedAt: now
  });

  // 10. WALLETS
  const systemWallet = await connection.collection('wallets').insertOne({ type: 'SYSTEM', balance: 28000, createdAt: now, updatedAt: now });
  const csWallet = await connection.collection('wallets').insertOne({ userId: cs1.insertedId, type: 'STAFF', balance: 2000, createdAt: now, updatedAt: now });

  // 11. FINANCE TRANSACTIONS
  await connection.collection('transactions').insertMany([
    { walletId: systemWallet.insertedId, amount: 45000, type: 'CREDIT', category: 'REVENUE', description: 'Revenue from Delivered Order', orderId: deliveredOrder.insertedId, createdAt: now, updatedAt: now },
    { walletId: systemWallet.insertedId, amount: 15000, type: 'DEBIT', category: 'COGS', description: 'Cost of Watch', orderId: deliveredOrder.insertedId, createdAt: now, updatedAt: now },
    { walletId: csWallet.insertedId, amount: 2000, type: 'CREDIT', category: 'COMMISSION', description: 'Commission for Delivered Order', orderId: deliveredOrder.insertedId, createdAt: now, updatedAt: now },
  ]);

  // 12. ACCOUNTING (COA, Periods, Journals)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  await connection.collection('accountingperiods').insertOne({
    name: `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
    startDate: currentMonthStart, endDate: currentMonthEnd, isClosed: false, createdAt: now, updatedAt: now
  });

  const cashAccount = await connection.collection('accounts').insertOne({ code: '1000', name: 'Cash at Bank', type: 'ASSET', normalBalance: 'DEBIT', isActive: true, createdAt: now, updatedAt: now });
  const equityAccount = await connection.collection('accounts').insertOne({ code: '3000', name: 'Owner Equity', type: 'EQUITY', normalBalance: 'CREDIT', isActive: true, createdAt: now, updatedAt: now });

  await connection.collection('journalentries').insertOne({
    journalNumber: 'JRN-001', date: now, description: 'Initial Capital Injection', status: 'POSTED',
    lines: [
      { accountId: cashAccount.insertedId, debit: 5000000, credit: 0 },
      { accountId: equityAccount.insertedId, debit: 0, credit: 5000000 }
    ],
    createdAt: now, updatedAt: now
  });

  console.log('🏆 Database Seeded Successfully with Comprehensive V2 Data!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed Failed:', err);
  process.exit(1);
});
