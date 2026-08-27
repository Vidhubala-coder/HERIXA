import mongoose from 'mongoose';
import Monument from '../models/monument';
import { connectDatabase } from '../config/database';

async function showFirst() {
  await connectDatabase();
  try {
    const palace = await Monument.findOne({ slug: 'thirumalai-nayakkar' }).lean();
    if (palace) {
      console.log('--- Top fields of Palace document ---');
      console.log('ID:', palace._id);
      console.log('Name:', palace.name);
      console.log('Slug:', palace.slug);
      console.log('Category:', palace.category);
      console.log('IsActive (if exists):', (palace as any).isActive);
      console.log('Status (if exists):', (palace as any).status);
      console.log('Published (if exists):', (palace as any).published);
      console.log('Featured:', palace.featured);
      console.log('arEnabled:', palace.arEnabled);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

showFirst();
