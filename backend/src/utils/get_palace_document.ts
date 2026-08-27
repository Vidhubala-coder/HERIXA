import mongoose from 'mongoose';
import Monument from '../models/monument';
import { connectDatabase } from '../config/database';

async function showPalace() {
  await connectDatabase();
  try {
    const palace = await Monument.findOne({ slug: 'thirumalai-nayakkar' });
    console.log(JSON.stringify(palace, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

showPalace();
