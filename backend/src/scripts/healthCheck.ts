import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import redisClient from '../config/redis';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function healthCheck() {
  let isHealthy = true;

  console.log('--- Amar Bazar Health Check ---\n');

  // 1. Check MongoDB
  console.log('Checking MongoDB connection...');
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/amar-bazar');
    console.log('✅ MongoDB connection successful');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    isHealthy = false;
  }

  // 2. Check Redis
  console.log('\nChecking Redis connection...');
  try {
    const pingResponse = await redisClient.ping();
    if (pingResponse === 'PONG') {
      console.log('✅ Redis connection successful (PING -> PONG)');
    } else {
      console.error('❌ Redis connection failed (Unexpected response)');
      isHealthy = false;
    }
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    isHealthy = false;
  }

  // 3. Print Final Status
  console.log('\n--- Final Status ---');
  if (isHealthy) {
    console.log('🎉 All systems are operational.');
  } else {
    console.error('⚠️ Some systems are failing. Check the logs above.');
  }

  // Clean up
  await mongoose.disconnect();
  redisClient.disconnect();
  process.exit(isHealthy ? 0 : 1);
}

healthCheck().catch(err => {
  console.error('Unexpected Error:', err);
  process.exit(1);
});
