import 'dotenv/config';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { User } from '../models/user';
import { PasswordReset } from '../models/passwordReset';
import { AuditLog } from '../models/AuditLog';
import { History } from '../models/history';
import { connectDatabase } from '../config/database';
import { hashPassword } from './authUtils';
import { generateToken } from '../utils/cryptoAuth';
import { requireAdmin } from '../middleware/auth';
import {
  getStats,
  getUsers,
  getUserDetails,
  getActivityLogs
} from '../controllers/adminController';
import {
  registerUser,
  verifyOtp,
  loginUser,
  resetPassword,
  deleteAccount
} from '../controllers/userController';

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
  console.log('[ADMIN-TEST] Connecting to database...');
  await connectDatabase();

  const normalEmail = 'normal_test_user@gmail.com';
  const adminEmail = 'admin_test_user@gmail.com';
  const testPassword = 'password123';

  try {
    // 0. Clean up
    console.log('[ADMIN-TEST] Cleaning up previous test records...');
    await User.deleteMany({ email: { $in: [normalEmail, adminEmail, 'registration_flow_user@gmail.com'] } });
    await PasswordReset.deleteMany({ email: { $in: [normalEmail, adminEmail, 'registration_flow_user@gmail.com'] } });
    await AuditLog.deleteMany({});
    await History.deleteMany({});

    // Seed normal user
    const normalUser = new User({
      name: 'Normal User',
      email: normalEmail,
      passwordHash: hashPassword(testPassword),
      role: 'user',
      isEmailVerified: true
    });
    await normalUser.save();

    // Seed admin user
    const adminUser = new User({
      name: 'Admin User',
      email: adminEmail,
      passwordHash: hashPassword(testPassword),
      role: 'admin',
      isEmailVerified: true
    });
    await adminUser.save();
    console.log('✔ Test users seeded successfully.');

    // Generate tokens
    const normalToken = generateToken(normalUser._id.toString());
    const adminToken = generateToken(adminUser._id.toString());

    console.log('\n==================================================');
    console.log('RUNNING ADMIN USER & LOGS AUTHORIZATION TEST CASES');
    console.log('==================================================');

    // TEST 1: No token requireAdmin
    console.log('\n--- TEST 1: requireAdmin with No Token ---');
    const req1 = { headers: {} } as any;
    const res1 = mockResponse();
    let nextCalled1 = false;
    await requireAdmin(req1, res1, () => { nextCalled1 = true; });
    console.log(`Status: ${res1.statusCode}`);
    console.log(`Response: ${JSON.stringify(res1.jsonData)}`);
    if (res1.statusCode !== 401 || nextCalled1) {
      throw new Error('TEST 1 Failed: Expected 401 Unauthorized for missing token');
    }
    console.log('✔ Correctly blocked unauthenticated request.');

    // TEST 2: Normal user token requireAdmin
    console.log('\n--- TEST 2: requireAdmin with Normal User Token ---');
    const req2 = { headers: { authorization: `Bearer ${normalToken}` } } as any;
    const res2 = mockResponse();
    let nextCalled2 = false;
    await requireAdmin(req2, res2, () => { nextCalled2 = true; });
    console.log(`Status: ${res2.statusCode}`);
    console.log(`Response: ${JSON.stringify(res2.jsonData)}`);
    if (res2.statusCode !== 403 || nextCalled2) {
      throw new Error('TEST 2 Failed: Expected 403 Forbidden for normal user');
    }
    console.log('✔ Correctly blocked non-admin user.');

    // TEST 3: Admin token requireAdmin
    console.log('\n--- TEST 3: requireAdmin with Admin Token ---');
    const req3 = { headers: { authorization: `Bearer ${adminToken}` } } as any;
    const res3 = mockResponse();
    let nextCalled3 = false;
    await requireAdmin(req3, res3, () => { nextCalled3 = true; });
    if (!nextCalled3 || !req3.user || req3.user.role !== 'admin') {
      throw new Error('TEST 3 Failed: requireAdmin should allow admin user and attach user context');
    }
    console.log('✔ Admin correctly authorized.');

    console.log('\n==================================================');
    console.log('RUNNING AUDIT EVENT FLOW TEST CASES');
    console.log('==================================================');

    // TEST 4: Registration creates ACCOUNT_CREATED
    console.log('\n--- TEST 4: Registration flow & ACCOUNT_CREATED log ---');
    const regEmail = 'registration_flow_user@gmail.com';
    const req4 = { body: { name: 'Reg Flow User', email: regEmail, password: testPassword } } as any;
    const res4 = mockResponse();
    await registerUser(req4, res4, (err) => { if (err) throw err; });
    if (res4.statusCode !== 200) {
      throw new Error(`TEST 4 Failed: Registration failed with code ${res4.statusCode}`);
    }
    // Verify AuditLog
    const regUserDoc = await User.findOne({ email: regEmail });
    if (!regUserDoc) throw new Error('TEST 4 Failed: User doc not created');
    const creationLog = await AuditLog.findOne({ event: 'ACCOUNT_CREATED', userId: regUserDoc._id });
    if (!creationLog) {
      throw new Error('TEST 4 Failed: ACCOUNT_CREATED audit log not found');
    }
    console.log('✔ ACCOUNT_CREATED event verified successfully.');

    // TEST 5: Email verification creates EMAIL_VERIFIED
    console.log('\n--- TEST 5: Email Verification flow & EMAIL_VERIFIED log ---');
    // Fetch OTP from database directly (since dev OTP logging is console only)
    const otp = regUserDoc.otp; // Wait, OTP in DB is hashed!
    // In our test environment, registerUser generates a raw OTP and hashes it.
    // Wait, since we don't have the raw OTP easily because it is random, we can override OTP in DB with a known hash!
    const rawOtp = '123456';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
    regUserDoc.otp = otpHash;
    regUserDoc.otpExpires = new Date(Date.now() + 10000);
    await regUserDoc.save();

    const req5 = { body: { email: regEmail, otp: rawOtp } } as any;
    const res5 = mockResponse();
    await verifyOtp(req5, res5, (err) => { if (err) throw err; });
    if (res5.statusCode !== 200) {
      throw new Error(`TEST 5 Failed: verifyOtp failed with code ${res5.statusCode}`);
    }
    const verificationLog = await AuditLog.findOne({ event: 'EMAIL_VERIFIED', userId: regUserDoc._id });
    if (!verificationLog) {
      throw new Error('TEST 5 Failed: EMAIL_VERIFIED audit log not found');
    }
    console.log('✔ EMAIL_VERIFIED event verified successfully.');

    // TEST 6: Login updates lastLoginAt and logs LOGIN
    console.log('\n--- TEST 6: Login flow & LOGIN event log ---');
    const req6 = { body: { email: regEmail, password: testPassword } } as any;
    const res6 = mockResponse();
    await loginUser(req6, res6, (err) => { if (err) throw err; });
    if (res6.statusCode !== 200) {
      throw new Error(`TEST 6 Failed: loginUser failed with code ${res6.statusCode}`);
    }
    const loggedInUser = await User.findById(regUserDoc._id);
    if (!loggedInUser?.lastLoginAt) {
      throw new Error('TEST 6 Failed: User lastLoginAt was not updated');
    }
    const loginLog = await AuditLog.findOne({ event: 'LOGIN', userId: regUserDoc._id });
    if (!loginLog) {
      throw new Error('TEST 6 Failed: LOGIN audit log not found');
    }
    console.log('✔ lastLoginAt updated and LOGIN event verified successfully.');

    // TEST 7: Password Reset logs PASSWORD_RESET
    console.log('\n--- TEST 7: Password Recovery flow & PASSWORD_RESET log ---');
    const resetToken = 'dummy-reset-token';
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Seed PasswordReset record
    const pwReset = new PasswordReset({
      userId: regUserDoc._id,
      email: regEmail,
      otpHash: 'dummy',
      expiresAt: new Date(Date.now() + 60000),
      resetTokenHash,
      resetTokenExpiresAt: new Date(Date.now() + 60000)
    });
    await pwReset.save();

    const req7 = { body: { resetToken, newPassword: 'newpassword123', confirmPassword: 'newpassword123' } } as any;
    const res7 = mockResponse();
    await resetPassword(req7, res7, (err) => { if (err) throw err; });
    if (res7.statusCode !== 200) {
      throw new Error(`TEST 7 Failed: resetPassword failed with code ${res7.statusCode}`);
    }
    const resetLog = await AuditLog.findOne({ event: 'PASSWORD_RESET', userId: regUserDoc._id });
    if (!resetLog) {
      throw new Error('TEST 7 Failed: PASSWORD_RESET audit log not found');
    }
    console.log('✔ PASSWORD_RESET event verified successfully.');

    // TEST 8: Account deletion logs ACCOUNT_DELETED
    console.log('\n--- TEST 8: Delete Account flow & ACCOUNT_DELETED log ---');
    // Reload user to get updated passwordHash
    const updatedUser = await User.findById(regUserDoc._id);
    if (!updatedUser) throw new Error('User not found');

    const req8 = {
      user: { _id: regUserDoc._id },
      body: { password: 'newpassword123' }
    } as any;
    const res8 = mockResponse();
    await deleteAccount(req8, res8, (err) => { if (err) throw err; });
    if (res8.statusCode !== 200) {
      throw new Error(`TEST 8 Failed: deleteAccount failed with code ${res8.statusCode}`);
    }
    const deletionLog = await AuditLog.findOne({ event: 'ACCOUNT_DELETED', userId: regUserDoc._id });
    if (!deletionLog) {
      throw new Error('TEST 8 Failed: ACCOUNT_DELETED audit log not found');
    }
    console.log('✔ ACCOUNT_DELETED event verified successfully.');

    console.log('\n==================================================');
    console.log('RUNNING ADMIN DATA ENDPOINTS TEST CASES');
    console.log('==================================================');

    // TEST 9: Stats API
    console.log('\n--- TEST 9: Admin getStats API ---');
    const req9 = {} as any;
    const res9 = mockResponse();
    await getStats(req9, res9, (err) => { if (err) throw err; });
    console.log(`Stats Response: ${JSON.stringify(res9.jsonData)}`);
    if (res9.statusCode !== 200 || !res9.jsonData.success) {
      throw new Error('TEST 9 Failed: Stats API failed');
    }
    const stats = res9.jsonData.data;
    if (stats.totalUsers < 2 || stats.verifiedUsers < 2 || stats.deletedAccounts < 1) {
      throw new Error(`TEST 9 Failed: Stats values incorrect. Total: ${stats.totalUsers}, Verified: ${stats.verifiedUsers}, Deleted: ${stats.deletedAccounts}`);
    }
    console.log('✔ stats API verified successfully.');

    // TEST 10: Users List & Search API
    console.log('\n--- TEST 10: Admin getUsers & search API ---');
    const req10 = { query: { search: 'Admin' } } as any;
    const res10 = mockResponse();
    await getUsers(req10, res10, (err) => { if (err) throw err; });
    if (res10.statusCode !== 200 || res10.jsonData.data.length < 1) {
      throw new Error(`TEST 10 Failed: User search failed. Got count: ${res10.jsonData.data.length}`);
    }
    const hasAdmin = res10.jsonData.data.some((u: any) => u.name.includes('Admin'));
    if (!hasAdmin) {
      throw new Error('TEST 10 Failed: Expected Admin User name in search results');
    }
    console.log('✔ getUsers list and search verification succeeded.');

    // TEST 11: User details and activities list
    console.log('\n--- TEST 11: Admin getUserDetails API ---');
    const req11 = { params: { id: normalUser._id.toString() } } as any;
    const res11 = mockResponse();
    await getUserDetails(req11, res11, (err) => { if (err) throw err; });
    if (res11.statusCode !== 200 || !res11.jsonData.data.user) {
      throw new Error('TEST 11 Failed: getUserDetails failed');
    }
    console.log('✔ getUserDetails API verified successfully.');

    // TEST 12: Activity Logs List API
    console.log('\n--- TEST 12: Admin getActivityLogs API ---');
    const req12 = { query: { event: 'ALL' } } as any;
    const res12 = mockResponse();
    await getActivityLogs(req12, res12, (err) => { if (err) throw err; });
    if (res12.statusCode !== 200 || res12.jsonData.data.length === 0) {
      throw new Error('TEST 12 Failed: getActivityLogs returned empty');
    }
    console.log('✔ getActivityLogs API verified successfully.');

    console.log('\n==================================================');
    console.log('RUNNING ADMIN DATA SANITIZATION SECRECY TESTS');
    console.log('==================================================');

    // TEST 13: Secrecy check
    console.log('\n--- TEST 13: Secrecy Check for returned users ---');
    const req13 = { query: { limit: 20 } } as any;
    const res13 = mockResponse();
    await getUsers(req13, res13, (err) => { if (err) throw err; });
    const fetchedUsers = res13.jsonData.data;
    for (const u of fetchedUsers) {
      if (u.passwordHash || u.password || u.otp || u.otpExpires || u.resetToken || u.verificationToken) {
        throw new Error('TEST 13 Failed: Sensitive authentication credentials leaked in users list');
      }
    }
    console.log('✔ Secrecy checks passed. Secrets are never exposed.');

    console.log('\n==================================================');
    console.log('ALL ADMIN USER & TRACKING INTEGRATION TESTS PASSED!');
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
