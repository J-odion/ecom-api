import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

// STRICTLY use environment variables only. Never hardcode secrets.
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI environment variable is not defined.');
  process.exit(1);
}

async function seed() {
  console.log('Connecting to database...');
  const connection = await mongoose.createConnection(MONGO_URI!).asPromise();
  console.log('Connected to:', connection.name);

  // Clear existing data
  console.log('Clearing existing data...');
  const collections = await connection.db!.listCollections().toArray();
  for (const collection of collections) {
    await connection.collection(collection.name).deleteMany({});
  }
  console.log('Cleared existing data.');

  // 1. Create Locations
  const lagos = await connection.collection('locations').insertOne({
    name: 'Lagos Main Office',
    address: '123 Ikeja Way, Lagos',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const abuja = await connection.collection('locations').insertOne({
    name: 'Abuja Distribution Center',
    address: '45 Garki Road, Abuja',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Created Locations.');

  // 2. Create Products
  const watch = await connection.collection('products').insertOne({
    name: 'Luxury Watch',
    description: 'Stainless steel waterproof watch',
    baseCost: 20000,
    sellingPrice: 55000,
    sku: 'WATCH-001',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const wallet = await connection.collection('products').insertOne({
    name: 'Slim Leather Wallet',
    description: 'Minimalist RFID blocking wallet',
    baseCost: 5000,
    sellingPrice: 15000,
    sku: 'WALLET-001',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Created Products.');

  // 3. Create Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await connection.collection('users').insertOne({
    fullName: 'System Admin',
    email: 'admin@example.com',
    password: hashedPassword,
    role: 'admin',
    isActive: true,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const sarah = await connection.collection('users').insertOne({
    fullName: 'Sarah CS',
    email: 'sarah@example.com',
    password: hashedPassword,
    role: 'customer_service',
    locationId: lagos.insertedId,
    isActive: true,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const mike = await connection.collection('users').insertOne({
    fullName: 'Mike Media',
    email: 'mike@example.com',
    password: hashedPassword,
    role: 'media_buyer',
    isActive: true,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const john = await connection.collection('users').insertOne({
    fullName: 'John Rider',
    email: 'john@example.com',
    password: hashedPassword,
    role: 'logistics',
    locationId: lagos.insertedId,
    isActive: true,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Created Users.');

  // 4. Create Stock Levels
  await connection.collection('stocklevels').insertMany([
    {
      productId: watch.insertedId,
      locationId: lagos.insertedId,
      stock: 50,
      reservedStock: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      productId: watch.insertedId,
      locationId: abuja.insertedId,
      stock: 20,
      reservedStock: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      productId: wallet.insertedId,
      locationId: lagos.insertedId,
      stock: 100,
      reservedStock: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);

  console.log('Created Stock Levels.');

  // 5. Create Leads
  await connection.collection('leads').insertMany([
    {
      customerName: 'Alice Johnson',
      customerPhone: '08012345678',
      customerAddress: '10 Victoria Island, Lagos',
      productId: watch.insertedId,
      quantity: 1,
      status: 'NEW',
      sourceMediaBuyerId: mike.insertedId,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      customerName: 'Bob Smith',
      customerPhone: '09087654321',
      customerAddress: '22 Maitama, Abuja',
      productId: wallet.insertedId,
      quantity: 2,
      status: 'NEW',
      sourceMediaBuyerId: mike.insertedId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);

  console.log('Created Leads.');

  // 6. Create Spend Logs
  await connection.collection('spendlogs').insertOne({
    mediaBuyerId: mike.insertedId,
    date: new Date(),
    amountSpent: 15000,
    amountReceived: 0,
    productName: 'Luxury Watch',
    balance: -15000,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Created Spend Logs.');

  // 7. Create a System Wallet
  await connection.collection('wallets').insertOne({
    type: 'SYSTEM',
    balance: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Seed completed successfully!');
  await connection.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
