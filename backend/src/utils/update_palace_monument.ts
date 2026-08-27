import mongoose from 'mongoose';
import Monument from '../models/monument';
import { connectDatabase } from '../config/database';

async function migratePalace() {
  await connectDatabase();
  try {
    console.log('[MIGRATION] Checking Thirumalai Nayakkar Palace in MongoDB...');
    const palace = await Monument.findOne({ slug: 'thirumalai-nayakkar' });
    if (!palace) {
      console.error('[MIGRATION] ❌ Thirumalai Nayakkar Palace document not found!');
      return;
    }

    const payload = {
      historySections: [
        {
          id: 'sec-palace-royal-commission',
          title: 'The Royal Commission',
          content: 'The palace was commissioned by King Thirumalai Nayak in the 17th century (1636 CE) as his royal residence and administrative headquarters. It is known for its Indo-Saracenic architectural character and monumental courtyards, arches, domes, and stucco work.',
          images: [],
          imageUrls: [],
          order: 1
        },
        {
          id: 'sec-palace-architecture',
          title: 'Indo-Saracenic Architecture',
          content: 'The palace is celebrated for its giant circular white pillars, rising to a height of 82 feet with a circumference of 19 feet. The design reflects a fusion of Italian, Islamic, and Dravidian styles, constructed using brick and lime concrete without using heavy iron structural beams.',
          images: [],
          imageUrls: [],
          order: 2
        }
      ],
      location: 'Madurai',
      state: 'Tamil Nadu',
      country: 'India'
    };

    const updated = await Monument.findOneAndUpdate(
      { slug: 'thirumalai-nayakkar' },
      { $set: payload },
      { new: true }
    );

    if (updated) {
      console.log('[MIGRATION] ✅ Thirumalai Nayakkar Palace updated successfully!');
      console.log('Updated historySections:', JSON.stringify(updated.historySections, null, 2));
    } else {
      console.error('[MIGRATION] ❌ Failed to update Palace document!');
    }
  } catch (err) {
    console.error('[MIGRATION] Error running migration:', err);
  } finally {
    await mongoose.disconnect();
    console.log('[MIGRATION] MongoDB connection closed.');
  }
}

migratePalace();
