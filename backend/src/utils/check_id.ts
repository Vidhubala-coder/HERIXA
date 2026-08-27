import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

import Monument from '../models/monument';

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/heritage_ar';
  console.log('Connecting to MongoDB at:', mongoUri);
  await mongoose.connect(mongoUri);

  try {
    const list = await Monument.find({}, 'name slug _id');
    console.log('\nSeeded Monument IDs in Database:');
    list.forEach(m => {
      console.log(`- ${m.name} (${m.slug}): ID = ${m._id.toString()}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
