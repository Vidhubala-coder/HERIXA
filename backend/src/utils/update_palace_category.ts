import mongoose from 'mongoose';
import Monument from '../models/monument';
import { connectDatabase } from '../config/database';

async function updateCategory() {
  await connectDatabase();
  try {
    console.log('[MIGRATION] Checking category of Thirumalai Nayakkar Palace in MongoDB...');
    const palace = await Monument.findOne({ slug: 'thirumalai-nayakkar' });
    if (!palace) {
      console.error('[MIGRATION] ❌ Thirumalai Nayakkar Palace document not found!');
      return;
    }

    const updated = await Monument.findOneAndUpdate(
      { slug: 'thirumalai-nayakkar' },
      { $set: { category: 'Forts' } },
      { new: true }
    );

    if (updated) {
      console.log('[MIGRATION] ✅ Thirumalai Nayakkar Palace category updated to Forts!');
      console.log('Category:', updated.category);
    } else {
      console.error('[MIGRATION] ❌ Failed to update category!');
    }
  } catch (err) {
    console.error('[MIGRATION] Error running migration:', err);
  } finally {
    await mongoose.disconnect();
    console.log('[MIGRATION] MongoDB connection closed.');
  }
}

updateCategory();
