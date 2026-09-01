import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/user';
import { PasswordReset } from '../models/passwordReset';
import { History } from '../models/history';
import { connectDatabase } from '../config/database';
import { hashPassword } from './authUtils';
import { deleteAccount } from '../controllers/userController';

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
  console.log('[DELETION-TEST] Connecting to database...');
  await connectDatabase();

  const testEmail = 'test_delete_user@gmail.com';
  const testPassword = 'password123';

  try {
    console.log('[DELETION-TEST] Cleaning up previous test records...');
    await User.deleteMany({ email: testEmail });
    await PasswordReset.deleteMany({ email: testEmail });

    // Create target test user
    const user = new User({
      name: 'Deletion Test User',
      email: testEmail,
      passwordHash: hashPassword(testPassword),
      role: 'user',
      isEmailVerified: true
    });
    await user.save();
    console.log('✔ Test user created.');

    // Seed test history
    const history1 = new History({
      userId: user._id,
      actionType: 'search',
      query: 'Chola Dynasty'
    });
    await history1.save();

    const history2 = new History({
      userId: user._id,
      actionType: 'view'
    });
    await history2.save();
    console.log('✔ Test user history logs seeded.');

    // Seed test password resets
    const reset = new PasswordReset({
      email: testEmail,
      userId: user._id,
      otpHash: 'dummysha256hashcode',
      expiresAt: new Date(Date.now() + 60000),
      attempts: 0
    });
    await reset.save();
    console.log('✔ Test password reset session seeded.');

    console.log('\n==================================================');
    console.log('RUNNING USER ACCOUNT DELETION TEST CASES');
    console.log('==================================================');

    // 1. Delete account with missing password
    console.log('\n--- TEST 1: Account Deletion with Missing Password ---');
    const req1 = {
      user: { _id: user._id },
      body: {}
    } as any;
    const res1 = mockResponse();
    await deleteAccount(req1, res1, (err) => { if (err) throw err; });
    console.log(`Status: ${res1.statusCode}`);
    console.log(`Response: ${JSON.stringify(res1.jsonData)}`);
    if (res1.statusCode !== 400 || res1.jsonData.success) {
      throw new Error('TEST 1 Failed: Expected 400 bad request for missing password');
    }
    console.log('✔ Missing password correctly rejected.');

    // 2. Delete account with incorrect password
    console.log('\n--- TEST 2: Account Deletion with Incorrect Password ---');
    const req2 = {
      user: { _id: user._id },
      body: { password: 'wrongpassword' }
    } as any;
    const res2 = mockResponse();
    await deleteAccount(req2, res2, (err) => { if (err) throw err; });
    console.log(`Status: ${res2.statusCode}`);
    console.log(`Response: ${JSON.stringify(res2.jsonData)}`);
    if (res2.statusCode !== 401 || res2.jsonData.success) {
      throw new Error('TEST 2 Failed: Expected 401 unauthorized for wrong password');
    }
    console.log('✔ Incorrect password correctly rejected.');

    // 3. Successful account deletion
    console.log('\n--- TEST 3: Successful Account Deletion ---');
    const req3 = {
      user: { _id: user._id },
      body: { password: testPassword }
    } as any;
    const res3 = mockResponse();
    await deleteAccount(req3, res3, (err) => { if (err) throw err; });
    console.log(`Status: ${res3.statusCode}`);
    console.log(`Response: ${JSON.stringify(res3.jsonData)}`);
    if (res3.statusCode !== 200 || !res3.jsonData.success) {
      throw new Error('TEST 3 Failed: Expected 200 for successful deletion');
    }
    console.log('✔ Account deletion API succeeded.');

    // 4. Verify cascade deletions and database state
    console.log('\n--- TEST 4: Verifying Database Cascade Deletion ---');
    const deletedUser = await User.findById(user._id);
    const remainingHistories = await History.find({ userId: user._id });
    const remainingResets = await PasswordReset.find({ userId: user._id });

    console.log(`Remaining User count: ${deletedUser ? 1 : 0}`);
    console.log(`Remaining Histories count: ${remainingHistories.length}`);
    console.log(`Remaining Resets count: ${remainingResets.length}`);

    if (deletedUser) {
      throw new Error('TEST 4 Failed: User record still exists in DB');
    }
    if (remainingHistories.length > 0) {
      throw new Error('TEST 4 Failed: User history records still exist in DB');
    }
    if (remainingResets.length > 0) {
      throw new Error('TEST 4 Failed: User password resets still exist in DB');
    }
    console.log('✔ All associated records cascaded and verified deleted.');

    console.log('\n==================================================');
    console.log('ALL ACCOUNT DELETION INTEGRATION TESTS PASSED!');
    console.log('==================================================');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection disconnected.');
  }
}

runTests();
