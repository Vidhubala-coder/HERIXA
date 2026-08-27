import mongoose from 'mongoose';
import Monument from '../models/monument';
import { connectDatabase } from '../config/database';

async function checkMonumentsList() {
  await connectDatabase();
  try {
    const list = await Monument.find({}).sort({ createdAt: -1 });
    console.log(`\nFound ${list.length} monuments total in MongoDB:`);
    list.forEach((m, idx) => {
      console.log(`${idx + 1}. Name: "${m.name}", Slug: "${m.slug}", Category: "${m.category}", ID: ${m._id}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkMonumentsList();
