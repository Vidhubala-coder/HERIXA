import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { runAdminMigration } from './migration';
import User from '../models/user';

async function verify() {
  await connectDatabase();
  try {
    console.log('[VERIFY] Running runAdminMigration...');
    await runAdminMigration();

    console.log('[VERIFY] Checking admin user details in database...');
    const admin = await User.findOne({ email: 'vidhub657@gmail.com' });
    if (admin) {
      console.log('✅ Admin account exists!');
      console.log('Email:', admin.email);
      console.log('Role:', admin.role);
      console.log('Password hash present:', !!admin.passwordHash);
    } else {
      console.error('❌ Admin account not found in MongoDB!');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log('[VERIFY] Disconnected from MongoDB.');
  }
}

verify();
