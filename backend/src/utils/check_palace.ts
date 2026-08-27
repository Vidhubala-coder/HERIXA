import mongoose from 'mongoose';
import Monument from '../models/monument';
import { connectDatabase } from '../config/database';

async function checkPalace() {
  await connectDatabase();
  try {
    const palace = await Monument.findOne({ slug: 'thirumalai-nayakkar' });
    if (!palace) {
      console.log('❌ Palace not found by slug: thirumalai-nayakkar');
      return;
    }
    console.log('Palace Document found in MongoDB:');
    console.log(JSON.stringify(palace.toJSON(), null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkPalace();
