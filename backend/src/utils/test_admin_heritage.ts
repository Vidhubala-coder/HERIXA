import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/user';
import Monument from '../models/monument';
import { connectDatabase } from '../config/database';
import { createMonument, updateMonument } from '../controllers/monumentController';

const mockResponse = () => {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.jsonData = data;
    return res;
  };
  return res;
};

async function runTests() {
  console.log('[HERITAGE-TEST] Connecting to database...');
  await connectDatabase();

  console.log('[HERITAGE-TEST] Seeding test users...');
  await User.deleteMany({ email: /heritage_test/ });
  
  const adminUser = new User({
    name: 'Heritage Test Admin',
    email: 'admin_heritage_test@gmail.com',
    passwordHash: 'dummyhash',
    role: 'admin',
    isEmailVerified: true,
  });
  await adminUser.save();

  const normalUser = new User({
    name: 'Heritage Test User',
    email: 'user_heritage_test@gmail.com',
    passwordHash: 'dummyhash',
    role: 'user',
    isEmailVerified: true,
  });
  await normalUser.save();

  console.log('==================================================');
  console.log('RUNNING ADMIN HERITAGE MANAGEMENT TEST CASES');
  console.log('==================================================');

  // Cleanup old test monuments
  await Monument.deleteMany({ name: /Test Monument/ });

  // TEST 1: Successful Create Monument (using admin user attached to req.user)
  console.log('\n--- TEST 1: Successful Monument Creation by Admin ---');
  const req1: any = {
    body: {
      name: 'Test Monument One',
      location: 'Test Location',
      state: 'Test State',
      category: 'Temples',
      period: '10th Century CE',
      dynasty: 'Test Dynasty',
      description: 'A beautiful test monument.',
    },
    user: adminUser
  };
  const res1 = mockResponse();
  await createMonument(req1, res1, (() => {}) as any);

  console.log('Status:', res1.statusCode);
  console.log('Response:', JSON.stringify(res1.jsonData));
  if (res1.statusCode === 201 && res1.jsonData.success) {
    console.log('✔ Monument created successfully.');
  } else {
    throw new Error('TEST 1 FAILED');
  }

  // TEST 2: Unique Slug Uniqueness Check
  console.log('\n--- TEST 2: Unique Slug Resolution on Collisions ---');
  const req2: any = {
    body: {
      name: 'Test Monument One',
      location: 'Test Location',
      state: 'Test State',
      category: 'Temples',
      period: '10th Century CE',
      dynasty: 'Test Dynasty',
    },
    user: adminUser
  };
  const res2 = mockResponse();
  await createMonument(req2, res2, (() => {}) as any);

  console.log('Status:', res2.statusCode);
  console.log('Resolved Slug:', res2.jsonData.data?.slug);
  if (res2.statusCode === 201 && res2.jsonData.data?.slug === 'test-monument-one-1') {
    console.log('✔ Unique slug successfully generated.');
  } else {
    throw new Error('TEST 2 FAILED');
  }

  // TEST 3: Update Monument Details
  console.log('\n--- TEST 3: Admin Updating Monument Details ---');
  const monumentId = res1.jsonData.data._id.toString();
  const req3: any = {
    params: { id: monumentId },
    body: {
      description: 'Updated test monument description.',
      featured: true,
    },
    user: adminUser
  };
  const res3 = mockResponse();
  await updateMonument(req3, res3, (() => {}) as any);

  console.log('Status:', res3.statusCode);
  console.log('Updated Description:', res3.jsonData.data?.description);
  console.log('Updated Featured:', res3.jsonData.data?.featured);
  if (res3.statusCode === 200 && res3.jsonData.data?.description === 'Updated test monument description.' && res3.jsonData.data?.featured === true) {
    console.log('✔ Monument details updated successfully.');
  } else {
    throw new Error('TEST 3 FAILED');
  }

  console.log('\n==================================================');
  console.log('ALL HERITAGE SITE MANAGEMENT TESTS PASSED!');
  console.log('==================================================');

  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
