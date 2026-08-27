import mongoose from 'mongoose';
import Monument from '../models/monument';
import { connectDatabase } from '../config/database';

async function checkDuplicates() {
  await connectDatabase();
  try {
    const list = await Monument.find({
      $or: [
        { name: /Thirumalai/i },
        { slug: /thirumalai/i }
      ]
    });
    console.log(`Found ${list.length} documents matching 'Thirumalai':`);
    list.forEach((doc, idx) => {
      console.log(`\n--- Document #${idx + 1} ---`);
      console.log(`ID: ${doc._id}`);
      console.log(`Name: ${doc.name}`);
      console.log(`Slug: ${doc.slug}`);
      console.log(`Description (first 50 chars): ${doc.description?.substring(0, 50)}`);
      console.log(`HistoricalBackground (first 50 chars): ${doc.historicalBackground?.substring(0, 50)}`);
      console.log(`Architecture (first 50 chars): ${doc.architecture?.substring(0, 50)}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkDuplicates();
