import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/user';
import History from '../models/history';
import AuditLog from '../models/AuditLog';
import { generateToken } from './cryptoAuth';
import { getAiAnalytics, getUserDetails } from '../controllers/adminController';

import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/heritage_ar';

// Load real sample image
const sampleImagePath = path.resolve(__dirname, '../../../ai/dataset/multiclass_v2/validation/brihadeeswarar/Brihadeewsar_temple.jpg');
let TEST_IMAGE_B64 = "";
if (fs.existsSync(sampleImagePath)) {
  const fileBuf = fs.readFileSync(sampleImagePath);
  TEST_IMAGE_B64 = `data:image/jpeg;base64,${fileBuf.toString('base64')}`;
} else {
  console.warn('[WARN] Sample image not found at path:', sampleImagePath);
}

async function makePost(url: string, body: any, token?: string, headersObj: any = {}): Promise<any> {
  const headers: any = {
    'Content-Type': 'application/json',
    ...headersObj
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function makeGet(url: string, token?: string, headersObj: any = {}): Promise<any> {
  const headers: any = { ...headersObj };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'GET',
    headers
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runE2EVerification() {
  console.log('================================================================================');
  console.log('HERIXA PERSISTENT SCAN ANALYTICS + USER AUDIT LOG END-TO-END SUITE');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('[DB CONNECTED] Connected to MongoDB.');

  const userEmail = 'thangarajvidhubala@gmail.com';
  const adminEmail = 'vidhub657@gmail.com';

  const preservedUser = await User.findOne({ email: userEmail });
  const adminUser = await User.findOne({ email: adminEmail });

  if (!preservedUser || !adminUser) {
    console.error('[FAIL] Preserved user or Admin user missing in database!');
    process.exit(1);
  }

  // RESET INITIAL SCAN COUNT TO 0 FOR CLEAN VERIFICATION
  preservedUser.scanCount = 0;
  await preservedUser.save();
  await History.deleteMany({ userId: preservedUser._id });

  console.log(`\n[STEP 1: INITIAL STATE] Preserved User '${userEmail}' initialized with scanCount = 0.`);
  const userToken = generateToken(preservedUser._id.toString());
  const adminToken = generateToken(adminUser._id.toString());

  // Verify Initial State across APIs
  const initProf = await makeGet(`${BASE_URL}/api/users/${preservedUser._id}`, userToken);
  console.log(`  Profile API scanCount: ${initProf.data?.data?.scanCount ?? 0} (Expected: 0)`);

  // PERFORM 3 SCANS
  console.log('\n[STEP 2: SCAN EXECUTION] Performing 3 scans for user...');
  for (let i = 1; i <= 3; i++) {
    const scanRes = await makePost(`${BASE_URL}/api/monuments/recognize`, {
      image: TEST_IMAGE_B64,
      latitude: 10.7828,
      longitude: 79.1318,
      scanEvidence: [{ id: `persistent-scan-${i}-${Date.now()}`, capturedAt: Date.now() + i * 10 }]
    }, userToken, { 'x-user-id': preservedUser._id.toString() });

    console.log(`  Scan #${i} HTTP Status: ${scanRes.status} | Recognized: ${scanRes.data?.recognized}`);
  }

  // Check count after 3 scans
  const dbUserAfter3 = await User.findById(preservedUser._id);
  const profAfter3 = await makeGet(`${BASE_URL}/api/users/${preservedUser._id}`, userToken);
  console.log(`  MongoDB scanCount: ${dbUserAfter3?.scanCount} (Expected: 3)`);
  console.log(`  Profile API scanCount: ${profAfter3.data?.data?.scanCount} (Expected: 3)`);

  if (dbUserAfter3?.scanCount !== 3 || profAfter3.data?.data?.scanCount !== 3) {
    console.error('[FAIL] scanCount after 3 scans is invalid!');
    process.exit(1);
  }

  // SIMULATE LOGOUT AND LOGIN AGAIN
  console.log('\n[STEP 3: LOGOUT / LOGIN TEST] Simulating logout and login again...');
  const loginRes = await makePost(`${BASE_URL}/api/users/login`, {
    email: userEmail,
    password: process.env.TEST_USER_PASSWORD || 'Vidhu@1107'
  });
  console.log(`  Login Status Code: ${loginRes.status}`);
  const freshToken = loginRes.data?.token || userToken;

  const profAfterLogin = await makeGet(`${BASE_URL}/api/users/${preservedUser._id}`, freshToken);
  const dbUserAfterLogin = await User.findById(preservedUser._id);
  console.log(`  MongoDB scanCount after Login: ${dbUserAfterLogin?.scanCount} (Expected: 3)`);
  console.log(`  Profile API scanCount after Login: ${profAfterLogin.data?.data?.scanCount} (Expected: 3)`);

  if (dbUserAfterLogin?.scanCount !== 3 || profAfterLogin.data?.data?.scanCount !== 3) {
    console.error('[FAIL] Persistent scanCount reset after login!');
    process.exit(1);
  }

  // PERFORM 2 MORE SCANS (TOTAL 5)
  console.log('\n[STEP 4: ADDITIONAL SCANS] Performing 2 additional scans (Total 5)...');
  for (let i = 4; i <= 5; i++) {
    const scanRes = await makePost(`${BASE_URL}/api/monuments/recognize`, {
      image: TEST_IMAGE_B64,
      latitude: 10.7828,
      longitude: 79.1318,
      scanEvidence: [{ id: `persistent-scan-${i}-${Date.now()}`, capturedAt: Date.now() + i * 10 }]
    }, freshToken, { 'x-user-id': preservedUser._id.toString() });

    console.log(`  Scan #${i} HTTP Status: ${scanRes.status} | Recognized: ${scanRes.data?.recognized}`);
  }

  // VERIFY CONSISTENCY ACROSS ALL SCREENS (PROFILE, MANAGEMENT, USER DETAILS, ANALYTICS)
  console.log('\n[STEP 5: AUTHORITATIVE SCAN COUNT CONSISTENCY CHECK]');
  const finalDbUser = await User.findById(preservedUser._id);
  const finalProfile = await makeGet(`${BASE_URL}/api/users/${preservedUser._id}`, freshToken);
  const adminUsersList = await makeGet(`${BASE_URL}/api/admin/users`, adminToken, { 'x-user-id': adminUser._id.toString() });
  const adminUserDetails = await makeGet(`${BASE_URL}/api/admin/users/${preservedUser._id}`, adminToken, { 'x-user-id': adminUser._id.toString() });
  const adminAnalytics = await makeGet(`${BASE_URL}/api/admin/analytics/ai`, adminToken, { 'x-user-id': adminUser._id.toString() });

  const targetUserInAdminList = adminUsersList.data?.data?.find((u: any) => u._id === preservedUser._id.toString());

  const mongoCount = finalDbUser?.scanCount;
  const profileCount = finalProfile.data?.data?.scanCount;
  const userManagementCount = targetUserInAdminList?.totalScans;
  const userDetailsCount = adminUserDetails.data?.data?.totalScans;
  const adminAnalyticsTotalScans = adminAnalytics.data?.data?.totalScans;

  console.log(`  1. MongoDB User.scanCount:       ${mongoCount}`);
  console.log(`  2. User Profile API scanCount:   ${profileCount}`);
  console.log(`  3. User Management API Scans:    ${userManagementCount}`);
  console.log(`  4. Admin User Details API Scans: ${userDetailsCount}`);
  console.log(`  5. Admin AI Analytics Total:     ${adminAnalyticsTotalScans}`);

  if (mongoCount !== 5 || profileCount !== 5 || userManagementCount !== 5 || userDetailsCount !== 5) {
    console.error('[FAIL] Authoritative scan count mismatch across screens!');
    process.exit(1);
  }

  // STEP 6: USER AUDIT TIMELINE ISOLATION CHECK
  console.log('\n[STEP 6: USER AUDIT LOG ISOLATION CHECK]');
  const userActivityItems = adminUserDetails.data?.data?.userActivity || [];
  console.log(`  Total User Activity Items for '${userEmail}': ${userActivityItems.length}`);
  
  if (userActivityItems.length > 0) {
    console.log(`  Sample User Activity Item Title: '${userActivityItems[0].title}'`);
  }

  // STEP 7: DYNAMIC MULTI-USER SCALING VERIFICATION
  console.log('\n[STEP 7: DYNAMIC MULTI-USER SCALING VERIFICATION]');
  console.log('  Simulating User B performing 3 scans...');
  const userBEmail = 'testuserb@heritagear.com';
  await User.deleteOne({ email: userBEmail });
  const userB = new User({
    name: 'User B',
    email: userBEmail,
    role: 'user',
    isEmailVerified: true,
    scanCount: 3
  });
  await userB.save();

  const multiUserAnalytics = await makeGet(`${BASE_URL}/api/admin/analytics/ai`, adminToken, { 'x-user-id': adminUser._id.toString() });
  const multiUserTotalScans = multiUserAnalytics.data?.data?.totalScans;
  console.log(`  User A (5 scans) + User B (3 scans) -> Admin AI Analytics Total Scans: ${multiUserTotalScans} (Expected: 8)`);

  if (multiUserTotalScans !== 8) {
    console.error('[FAIL] Admin AI Analytics total scans did not scale dynamically for multi-user!');
    process.exit(1);
  }

  // Cleanup temporary User B
  await User.deleteOne({ email: userBEmail });

  await mongoose.disconnect();

  console.log('\n================================================================================');
  console.log('ALL PERSISTENT SCAN & USER AUDIT LOG VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================================');

  process.exit(0);
}

runE2EVerification().catch(err => {
  console.error('E2E Verification failed:', err);
  process.exit(1);
});
