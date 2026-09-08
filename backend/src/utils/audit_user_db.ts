import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/user';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGODB_URI missing from environment');
  process.exit(1);
}

async function auditUsers() {
  await mongoose.connect(mongoUri as string);
  console.log('--- CONNECTED TO MONGODB ATLAS ---');

  const targetEmail = 'thangarajvidhubala@gmail.com';
  const user = await User.findOne({ email: targetEmail.toLowerCase().trim() });

  console.log(`\n--- USER AUDIT FOR ${targetEmail} ---`);
  if (user) {
    console.log(`ID: ${user._id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Role: ${user.role}`);
    console.log(`isEmailVerified: ${user.isEmailVerified}`);
    console.log(`otp: ${user.otp ? 'PRESENT' : 'NONE'}`);
    console.log(`otpExpires: ${user.otpExpires}`);
    console.log(`createdAt: ${user.createdAt}`);
  } else {
    console.log(`User ${targetEmail} NOT found in database.`);
  }

  console.log('\n--- ALL USERS IN DATABASE ---');
  const allUsers = await User.find({}, 'email isEmailVerified role createdAt');
  for (const u of allUsers) {
    console.log(`User: ${u.email} | verified: ${u.isEmailVerified} | role: ${u.role} | createdAt: ${u.createdAt}`);
  }

  await mongoose.disconnect();
}

auditUsers().catch(err => {
  console.error('Audit error:', err);
  process.exit(1);
});
