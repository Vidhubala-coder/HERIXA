import { getAllMonuments } from '../controllers/monumentController';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';

async function testController() {
  await connectDatabase();
  try {
    const req: any = {
      query: {}
    };
    const res: any = {
      status: (code: number) => {
        console.log('Status code:', code);
        return res;
      },
      json: (data: any) => {
        console.log('API returned success:', data.success);
        if (data.success) {
          console.log(`Returned ${data.data.length} monuments total:`);
          data.data.forEach((m: any, idx: number) => {
            console.log(`${idx + 1}. Name: "${m.name}", Slug: "${m.slug}", Category: "${m.category}", ID: ${m._id}`);
          });
        } else {
          console.log('Error message:', data.message);
        }
      }
    };
    const next = (err: any) => {
      console.error('Next called with error:', err);
    };

    console.log('[DEBUG] Calling getAllMonuments...');
    await getAllMonuments(req, res, next);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

testController();
