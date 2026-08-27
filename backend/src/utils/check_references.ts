import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

import Monument from '../models/monument';

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/heritage_ar';
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);

  try {
    const brih = await Monument.findOne({ slug: 'brihadeeswarar' });
    if (!brih) {
      console.log('Brihadeeswarar monument not found in database.');
      return;
    }

    console.log(`\nBrihadeeswarar Reference Images (${brih.referenceImages?.length || 0}):`);
    const categoryCounts: Record<string, number> = {};

    brih.referenceImages?.forEach((img: any, idx: number) => {
      console.log(`[${idx + 1}] Filename: ${img.filename}, viewType: ${img.viewType}, localPath: ${img.localPath}`);
      categoryCounts[img.viewType] = (categoryCounts[img.viewType] || 0) + 1;
    });

    console.log('\nReference categories detected and counted:');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`- ${cat} references: ${count}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
