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
  console.log('🚀 Starting Comprehensive Seed...');
  const connection = await mongoose.createConnection(MONGO_URI!).asPromise();
  
  // Clear existing data
  const collections = await connection.db!.listCollections().toArray();
  for (const coll of collections) {
    await connection.collection(coll.name).deleteMany({});
  }
  console.log('✅ Cleared existing data.');

  const now = new Date();
  const password = await bcrypt.hash('password123', 10);

  // 1. LOCATIONS
  const locLagos = await connection.collection('locations').insertOne({ name: 'Lagos HQ', address: 'Ikeja, Lagos', isActive: true, createdAt: now, updatedAt: now });
  const locAbuja = await connection.collection('locations').insertOne({ name: 'Abuja Branch', address: 'Wuse 2, Abuja', isActive: true, createdAt: now, updatedAt: now });

  // 2. USERS (STAFF)
  const admin = await connection.collection('users').insertOne({ email: 'admin@ecom.com', password, name: 'Main Admin', role: 'ADMIN', isVerified: true, isActive: true, locationId: locLagos.insertedId, createdAt: now });
  const buyer = await connection.collection('users').insertOne({ email: 'mike@ads.com', password, name: 'Mike Media', role: 'MEDIA_BUYER', isVerified: true, isActive: true, locationId: locLagos.insertedId, createdAt: now });
  const cs1 = await connection.collection('users').insertOne({ email: 'sarah@cs.com', password, name: 'Sarah CS', role: 'CUSTOMER_SERVICE', isVerified: true, isActive: true, locationId: locLagos.insertedId, createdAt: now });
  const cs2 = await connection.collection('users').insertOne({ email: 'david@cs.com', password, name: 'David CS', role: 'CUSTOMER_SERVICE', isVerified: true, isActive: true, locationId: locAbuja.insertedId, createdAt: now });
  const rider = await connection.collection('users').insertOne({ email: 'john@rider.com', password, name: 'John Rider', role: 'LOGISTICS', isVerified: true, isActive: true, locationId: locLagos.insertedId, createdAt: now });

  // 3. PRODUCTS
  const watch = await connection.collection('products').insertOne({ name: 'Luxury Gold Watch', description: 'Premium gold plated watch', baseCost: 15000, sellingPrice: 45000, sku: 'WCH-GOLD-001', category: 'Accessories', createdAt: now });
  const wallet = await connection.collection('products').insertOne({ name: 'Leather Smart Wallet', description: 'RFID blocking leather wallet', baseCost: 5000, sellingPrice: 12000, sku: 'WLT-LTHR-002', category: 'Accessories', createdAt: now });

  // 4. INVENTORY (STOCK LEVELS)
  await connection.collection('stocklevels').insertMany([
    { productId: watch.insertedId, locationId: locLagos.insertedId, stock: 50, reservedStock: 0, createdAt: now },
    { productId: watch.insertedId, locationId: locAbuja.insertedId, stock: 20, reservedStock: 0, createdAt: now },
    { productId: wallet.insertedId, locationId: locLagos.insertedId, stock: 100, reservedStock: 0, createdAt: now },
  ]);

  // 5. ORDER FORMS (EMBEDDABLE)
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
    createdAt: now
  });

  // 6. ORDERS (Unified Leads & Orders Scenarios)
  // Scenario A: Fresh PENDING Order (Previously a Lead)
  const pendingOrder = await connection.collection('orders').insertOne({
    customerName: 'Alice Johnson', customerPhone: '08011122233', customerAddress: 'Lagos Island',
    items: [{ productId: watch.insertedId, qty: 1, unitPrice: 45000 }], totalAmount: 45000,
    status: 'PENDING', source: 'FACEBOOK', entryType: 'FORM', orderFormId: watchForm.insertedId,
    agentId: cs1.insertedId, isDuplicate: false, isReturning: false, submissionCount: 1, createdAt: now
  });

  // Scenario B: Abandoned Order (Cart Abandonment)
  const abandonedOrder = await connection.collection('orders').insertOne({
    customerName: 'Bob Partial', customerPhone: '08044455566',
    items: [{ productId: wallet.insertedId, qty: 1, unitPrice: 12000 }], totalAmount: 12000,
    status: 'ABANDONED', source: 'TIKTOK', entryType: 'FORM', orderFormId: watchForm.insertedId,
    agentId: null, isDuplicate: false, isReturning: false, submissionCount: 1, createdAt: now
  });

  // Scenario C: Returning Customer (Manual Entry, directly to Scheduled)
  const scheduledOrder = await connection.collection('orders').insertOne({
    customerName: 'Charlie Return', customerPhone: '08077788899', customerAddress: 'Wuse Abuja',
    items: [{ productId: watch.insertedId, qty: 1, unitPrice: 45000 }], totalAmount: 45000,
    status: 'SCHEDULED', source: 'DIRECT', entryType: 'MANUAL', deliveryFee: 2000,
    agentId: cs2.insertedId, isDuplicate: false, isReturning: true, submissionCount: 1,
    fulfillmentLocationId: locAbuja.insertedId, createdAt: now
  });

  // Scenario D: Delivered Order
  const deliveredOrder = await connection.collection('orders').insertOne({
    customerName: 'Diana Delivered', customerPhone: '08099900011', customerAddress: 'Wuse Abuja',
    agentId: cs2.insertedId, status: 'DELIVERED', totalAmount: 45000, deliveryFee: 2000,
    items: [{ productId: watch.insertedId, qty: 1, unitPrice: 45000 }],
    fulfillmentLocationId: locAbuja.insertedId, createdAt: new Date(Date.now() - 86400000)
  });

  // 8. LOGISTICS (DELIVERIES)
  await connection.collection('deliveries').insertOne({
    orderId: scheduledOrder.insertedId, deliveryAgentId: rider.insertedId, status: 'ASSIGNED', createdAt: now
  });

  // 9. COMMISSION RULES
  await connection.collection('commissionrules').insertOne({
    ruleType: 'PRODUCT', productId: watch.insertedId, amountType: 'FLAT', value: 2000, isActive: true, createdAt: now
  });

  // 10. WALLETS & FINANCE
  const systemWallet = await connection.collection('wallets').insertOne({ type: 'SYSTEM', balance: 28000, createdAt: now });
  const csWallet = await connection.collection('wallets').insertOne({ userId: cs2.insertedId, type: 'STAFF', balance: 2000, createdAt: now });

  // 11. TRANSACTIONS (Financial Trail for Delivered Order)
  await connection.collection('transactions').insertMany([
    { walletId: systemWallet.insertedId, amount: 45000, type: 'CREDIT', category: 'REVENUE', description: 'Revenue from Delivered Order', orderId: deliveredOrder.insertedId, createdAt: now },
    { walletId: systemWallet.insertedId, amount: 15000, type: 'DEBIT', category: 'COGS', description: 'Cost of Watch', orderId: deliveredOrder.insertedId, createdAt: now },
    { walletId: csWallet.insertedId, amount: 2000, type: 'CREDIT', category: 'COMMISSION', description: 'Commission for Delivered Order', orderId: deliveredOrder.insertedId, createdAt: now },
  ]);

  console.log('🏆 Database Seeded Successfully with Full Journey Data!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed Failed:', err);
  process.exit(1);
});
