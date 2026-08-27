import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Monument from '../models/monument';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/heritage_ar';

async function checkDb() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const monuments = await Monument.find({}, 'name slug imageUrl image galleryImages');
    console.log(`Found ${monuments.length} monuments in DB:`);
    for (const m of monuments) {
      console.log('----------------------------------------');
      console.log('Name:', m.name);
      console.log('Slug:', m.slug);
      console.log('Image:', m.image);
      console.log('ImageUrl:', m.imageUrl);
      console.log('GalleryImages:', m.galleryImages);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkDb();
