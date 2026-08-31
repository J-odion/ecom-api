import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI environment variable is not defined.');
  process.exit(1);
}

async function createAdmin() {
  console.log('🚀 Checking for root admin user...');
  const connection = await mongoose.createConnection(MONGO_URI!).asPromise();
  
  const usersCollection = connection.collection('users');
  
  // Check if admin already exists
  const existingAdmin = await usersCollection.findOne({ email: 'admin@ecom.com' });
  
  if (existingAdmin) {
    console.log('✅ Root admin user already exists (admin@ecom.com).');
  } else {
    console.log('Creating root admin user...');
    const now = new Date();
    const password = await bcrypt.hash('password123', 10);
    
    await usersCollection.insertOne({ 
      email: 'admin@ecom.com', 
      password, 
      fullName: 'Main Admin', 
      legacyRole: 'ADMIN', 
      isVerified: true, 
      isActive: true, 
      createdAt: now,
      updatedAt: now
    });
    console.log('✅ Root admin user created successfully!');
    console.log('Email: admin@ecom.com');
    console.log('Password: password123');
  }

  process.exit(0);
}

createAdmin().catch(err => {
  console.error('❌ Failed to create admin:', err);
  process.exit(1);
});
