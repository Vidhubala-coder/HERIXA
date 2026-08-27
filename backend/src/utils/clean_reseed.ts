import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

import Monument from '../models/monument';
import { seedData } from './seed';

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/heritagear';
  console.log('Connecting to MongoDB at:', mongoUri);
  await mongoose.connect(mongoUri);
  console.log('Connection established.');

  try {
    console.log('Clearing existing monuments from database...');
    const res = await mongoose.connection.collection('monuments').deleteMany({});
    console.log(`Deleted ${res.deletedCount} monuments.`);
  } catch (err: any) {
    console.warn('Error clearing collection (it might not exist yet):', err.message);
  }

  console.log('Starting seedData...');
  try {
    await seedData();
    console.log('Clean seeding completed successfully!');
  } catch (err) {
    console.error('Error during clean seeding:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

run();
