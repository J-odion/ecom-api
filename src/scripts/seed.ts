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

  // 5. LEAD FORMS (EMBEDDABLE)
  const watchForm = await connection.collection('leadforms').insertOne({
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

  // 6. LEADS (IDENTITY SCENARIOS)
  // Scenario A: Fresh Lead
  const lead1 = await connection.collection('leads').insertOne({
    customerName: 'Alice Johnson', customerPhone: '08011122233', customerAddress: 'Lagos Island',
    productId: watch.insertedId, quantity: 1, status: 'NEW', source: 'FACEBOOK', entryType: 'FORM',
    assignedTo: cs1.insertedId, isDuplicate: false, isReturning: false, submissionCount: 1, createdAt: now
  });

  // Scenario B: Abandoned/Partial Lead
  const partialLead = await connection.collection('leads').insertOne({
    customerName: 'Bob Partial', customerPhone: '08044455566',
    productId: wallet.insertedId, quantity: 1, status: 'PARTIAL', source: 'TIKTOK', entryType: 'FORM',
    assignedTo: null, isDuplicate: false, isReturning: false, submissionCount: 1, createdAt: now
  });

  // Scenario C: Returning Customer (Has an existing order below)
  const returningLead = await connection.collection('leads').insertOne({
    customerName: 'Charlie Return', customerPhone: '08077788899', customerAddress: 'Wuse Abuja',
    productId: watch.insertedId, quantity: 1, status: 'NEW', source: 'DIRECT', entryType: 'MANUAL',
    assignedTo: cs2.insertedId, isDuplicate: false, isReturning: true, submissionCount: 1, createdAt: now
  });

  // 7. ORDERS
  // Order for the Returning Customer (Scenario C above)
  const order1 = await connection.collection('orders').insertOne({
    customerName: 'Charlie Return', customerPhone: '08077788899', customerAddress: 'Wuse Abuja',
    agentId: cs2.insertedId, status: 'DELIVERED', totalAmount: 45000, deliveryFee: 2000,
    items: [{ productId: watch.insertedId, qty: 1, unitPrice: 45000 }],
    fulfillmentLocationId: locAbuja.insertedId, createdAt: new Date(Date.now() - 86400000)
  });

  // New Active Order
  const order2 = await connection.collection('orders').insertOne({
    customerName: 'Alice Johnson', customerPhone: '08011122233', customerAddress: 'Lagos Island',
    agentId: cs1.insertedId, status: 'SCHEDULED', totalAmount: 45000, deliveryFee: 1500,
    items: [{ productId: watch.insertedId, qty: 1, unitPrice: 45000 }],
    leadId: lead1.insertedId, fulfillmentLocationId: locLagos.insertedId, createdAt: now
  });

  // 8. LOGISTICS (DELIVERIES)
  await connection.collection('deliveries').insertOne({
    orderId: order2.insertedId, deliveryAgentId: rider.insertedId, status: 'ASSIGNED', createdAt: now
  });

  // 9. COMMISSION RULES
  await connection.collection('commissionrules').insertOne({
    ruleType: 'PRODUCT', productId: watch.insertedId, amountType: 'FLAT', value: 2000, isActive: true, createdAt: now
  });

  // 10. WALLETS & FINANCE
  const systemWallet = await connection.collection('wallets').insertOne({ type: 'SYSTEM', balance: 28000, createdAt: now });
  const csWallet = await connection.collection('wallets').insertOne({ userId: cs2.insertedId, type: 'STAFF', balance: 2000, createdAt: now });

  // 11. TRANSACTIONS (Financial Trail for Order 1)
  await connection.collection('transactions').insertMany([
    { walletId: systemWallet.insertedId, amount: 45000, type: 'CREDIT', category: 'REVENUE', description: 'Revenue from Order 1', orderId: order1.insertedId, createdAt: now },
    { walletId: systemWallet.insertedId, amount: 15000, type: 'DEBIT', category: 'COGS', description: 'Cost of Watch', orderId: order1.insertedId, createdAt: now },
    { walletId: csWallet.insertedId, amount: 2000, type: 'CREDIT', category: 'COMMISSION', description: 'Commission for Order 1', orderId: order1.insertedId, createdAt: now },
  ]);

  console.log('🏆 Database Seeded Successfully with Full Journey Data!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed Failed:', err);
  process.exit(1);
});
