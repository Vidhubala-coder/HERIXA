import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/user';
import { hashPassword, verifyPassword } from './authUtils';
import { generateToken } from './cryptoAuth';

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function runAdminLoginVerification() {
  console.log('================================================================================');
  console.log('HERIXA ADMIN LOGIN & SECURITY END-TO-END VERIFICATION SUITE');
  console.log('================================================================================');

  const adminEmail = 'vidhub657@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'vidhu@1107';

  // 1. DATABASE RECORD CHECK
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/heritage_ar';
  await mongoose.connect(mongoUri);
  console.log('[STEP 1] Checking Admin Database Record in MongoDB...');

  const adminUser = await User.findOne({ email: adminEmail });
  if (!adminUser) {
    console.error(`[FAIL] Admin user ${adminEmail} not found in database!`);
    process.exit(1);
  }

  console.log(`  [OK] Admin User Found: ID=${adminUser._id}`);
  console.log(`  [OK] Normalized Email: '${adminUser.email}'`);
  console.log(`  [OK] Assigned Role:     '${adminUser.role}' (Must be 'admin')`);
  console.log(`  [OK] Email Verified:    ${adminUser.isEmailVerified}`);
  console.log(`  [OK] Has PasswordHash:  ${Boolean(adminUser.passwordHash)}`);

  if (adminUser.role !== 'admin') {
    console.error(`[FAIL] Role is '${adminUser.role}', expected 'admin'!`);
    process.exit(1);
  }

  // 2. PASSWORD HASH PBKDF2 VERIFICATION
  console.log('\n[STEP 2] Verifying PBKDF2 Password Hashing Compatibility...');
  const isPassValid = verifyPassword(adminPassword, adminUser.passwordHash!);
  console.log(`  [OK] PBKDF2 Hash Match Result for '${adminEmail}': ${isPassValid}`);
  if (!isPassValid) {
    console.error('[FAIL] Password hash verification failed!');
    process.exit(1);
  }

  // 3. HTTP LOGIN REQUEST TEST (Valid Credentials)
  console.log('\n[STEP 3] Testing POST /api/users/login with Valid Admin Credentials...');
  const loginRes = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });

  const loginData: any = await loginRes.json();
  console.log(`  HTTP Response Status: ${loginRes.status} (Expected: 200)`);
  console.log(`  Response Success Flag: ${loginData.success}`);
  console.log(`  Returned User Role:   '${loginData.data?.role}'`);
  console.log(`  Returned Token Exists: ${Boolean(loginData.token)}`);

  if (loginRes.status !== 200 || !loginData.success || !loginData.token) {
    console.error('[FAIL] Admin login request failed!', loginData);
    process.exit(1);
  }

  const token = loginData.token;
  const tokenUserId = token.split('.')[0];
  console.log(`  Token Embedded User ID: ${tokenUserId} (Matches MongoDB: ${tokenUserId === adminUser._id.toString()})`);

  // 4. PROTECTED ADMIN API ACCESS TEST
  console.log('\n[STEP 4] Testing Access to Protected Admin APIs using Generated JWT...');

  const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-user-id': adminUser._id.toString()
    }
  });
  console.log(`  GET /api/admin/stats Status Code: ${statsRes.status} (Expected: 200)`);

  const analyticsRes = await fetch(`${BASE_URL}/api/admin/analytics/ai`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-user-id': adminUser._id.toString()
    }
  });
  console.log(`  GET /api/admin/analytics/ai Status Code: ${analyticsRes.status} (Expected: 200)`);

  if (statsRes.status !== 200 || analyticsRes.status !== 200) {
    console.error('[FAIL] Protected admin API request failed!');
    process.exit(1);
  }

  // 5. INVALID PASSWORD TEST (Must return 401)
  console.log('\n[STEP 5] Testing Login with Invalid Password...');
  const badPassRes = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: 'WrongPassword123!' })
  });
  const badPassData: any = await badPassRes.json();
  console.log(`  HTTP Response Status: ${badPassRes.status} (Expected: 401)`);
  console.log(`  Error Message: '${badPassData.message}'`);

  if (badPassRes.status !== 401) {
    console.error('[FAIL] Invalid password did NOT return 401!');
    process.exit(1);
  }

  // 6. UNKNOWN EMAIL TEST (Must return 401)
  console.log('\n[STEP 6] Testing Login with Unknown Email...');
  const badEmailRes = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent_user_987654@gmail.com', password: adminPassword })
  });
  const badEmailData: any = await badEmailRes.json();
  console.log(`  HTTP Response Status: ${badEmailRes.status} (Expected: 401)`);
  console.log(`  Error Message: '${badEmailData.message}'`);

  if (badEmailRes.status !== 401) {
    console.error('[FAIL] Unknown email did NOT return 401!');
    process.exit(1);
  }

  await mongoose.disconnect();

  console.log('\n================================================================================');
  console.log('ALL ADMIN LOGIN & SECURITY TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================================');
}

runAdminLoginVerification().catch(err => {
  console.error('Test failed with exception:', err);
  process.exit(1);
});
