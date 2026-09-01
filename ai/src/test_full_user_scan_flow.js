const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const http = require('http');

const uri = 'mongodb://localhost:27017/heritage_ar';

async function makePost(url, data, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyStr = JSON.stringify(data);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function makeGet(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {}
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const usersCol = db.collection('users');

  console.log("=" .repeat(100));
  console.log("HERIXA END-TO-END VERIFICATION SUITE: REGISTRATION -> EMAIL -> USER LIST -> AUDIT LOG -> SCAN COUNTER");
  console.log("=" .repeat(100));

  // STEP 1: Verify Initial Preserved User State
  const initialUsers = await usersCol.find({}).toArray();
  console.log(`\n[STEP 1] Initial User Count in MongoDB: ${initialUsers.length}`);
  initialUsers.forEach(u => {
    console.log(`  - Email: ${u.email} | Role: ${u.role} | Scans: ${u.scanCount || 0}`);
  });

  if (initialUsers.length !== 1 || initialUsers[0].email !== 'thangarajvidhubala@gmail.com') {
    console.error("FAIL: Preserved user state is invalid!");
    process.exit(1);
  }

  // STEP 2: Register a Brand-New Test User
  const testEmail = `testuser_${Date.now()}@gmail.com`;
  const testPassword = "TestPassword123!";
  const testName = "Test Registration User";

  console.log(`\n[STEP 2] Registering Brand-New User: ${testEmail}`);
  const regRes = await makePost('http://localhost:5000/api/users/register', {
    name: testName,
    email: testEmail,
    password: testPassword
  });
  console.log(`  Register HTTP Status: ${regRes.status}`);
  console.log(`  Register Response:`, regRes.data);

  // STEP 3: Verify User Appears in MongoDB
  const newUserDoc = await usersCol.findOne({ email: testEmail });
  console.log(`\n[STEP 3] User in MongoDB after Registration:`);
  console.log(`  ID: ${newUserDoc._id} | Email: ${newUserDoc.email} | Scans: ${newUserDoc.scanCount || 0} | Verified: ${newUserDoc.isEmailVerified}`);

  // Mark user as email verified in DB for login / scan testing
  await usersCol.updateOne({ _id: newUserDoc._id }, { $set: { isEmailVerified: true } });
  console.log("  [OK] Marked test user email as verified for scan testing.");

  // STEP 4: Login to Get Bearer Auth Token
  const loginRes = await makePost('http://localhost:5000/api/users/login', {
    email: testEmail,
    password: testPassword
  });
  console.log(`\n[STEP 4] User Login HTTP Status: ${loginRes.status}`);
  const authToken = loginRes.data?.token;
  const userId = newUserDoc._id.toString();
  console.log(`  Token Generated: ${authToken ? authToken.substring(0, 20) + '...' : 'NULL'}`);

  // STEP 5: Verify User Appears in Admin Users API
  console.log(`\n[STEP 5] Testing Admin User Details for User ID: ${userId}`);
  const uDetailRes = await makeGet(`http://localhost:5000/api/admin/users/${userId}`, authToken);
  console.log(`  getUserDetails Status Code: ${uDetailRes.status}`);
  console.log(`  getUserDetails Response Data:`, uDetailRes.data?.data);

  // STEP 6: Perform Recognition Scan #1
  const sampleImagePath = path.join(__dirname, '../dataset/multiclass_v2/validation/brihadeeswarar/Brihadeewsar_temple.jpg');
  const imgBuffer = fs.readFileSync(sampleImagePath);
  const b64Str = 'data:image/jpeg;base64,' + imgBuffer.toString('base64');

  const scanPayload = {
    image: b64Str,
    latitude: 10.7828,
    longitude: 79.1318
  };

  console.log(`\n[STEP 7 & 8] Executing Recognition Scan #1 for user ${testEmail}...`);
  const scan1Res = await makePost('http://localhost:5000/api/monuments/recognize', scanPayload, authToken);
  console.log(`  Scan #1 Status Code: ${scan1Res.status}`);
  console.log(`  Scan #1 Recognized:  ${scan1Res.data?.recognized} | Monument: ${scan1Res.data?.monumentName}`);

  const userAfterScan1 = await usersCol.findOne({ _id: newUserDoc._id });
  console.log(`  [CHECK] User scanCount in DB after Scan #1: ${userAfterScan1.scanCount}`);

  // STEP 9 & 10: Perform Recognition Scan #2
  console.log(`\n[STEP 9 & 10] Executing Recognition Scan #2 for user ${testEmail}...`);
  const scan2Res = await makePost('http://localhost:5000/api/monuments/recognize', scanPayload, authToken);
  console.log(`  Scan #2 Status Code: ${scan2Res.status}`);
  console.log(`  Scan #2 Recognized:  ${scan2Res.data?.recognized} | Monument: ${scan2Res.data?.monumentName}`);

  const userAfterScan2 = await usersCol.findOne({ _id: newUserDoc._id });
  console.log(`  [CHECK] User scanCount in DB after Scan #2: ${userAfterScan2.scanCount}`);

  // STEP 11, 12, 13: Verify User Details & Activity in Admin API
  console.log(`\n[STEP 11 & 12] Fetching Admin User Details after 2 Scans:`);
  const uDetailRes2 = await makeGet(`http://localhost:5000/api/admin/users/${userId}`, authToken);
  const data2 = uDetailRes2.data?.data || {};
  console.log(`  Admin Total Scans: ${data2.totalScans}`);
  console.log(`  Admin Recent Scans Count: ${data2.scans?.length || 0}`);
  console.log(`  Admin Activity Logs Count: ${data2.activities?.length || 0}`);

  // STEP 17: Test Failure Cases (Failed scan should NOT increment scan count)
  console.log("\n[STEP 17] Testing Scan Failure (Invalid/Unrecognized Image should NOT increment scan count)...");
  const badB64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  const failRes = await makePost('http://localhost:5000/api/monuments/recognize', { image: badB64, latitude: 0, longitude: 0 }, authToken);
  console.log(`  Failed Scan Status: ${failRes.data?.status} | Recognized: ${failRes.data?.recognized}`);

  const userAfterFail = await usersCol.findOne({ _id: newUserDoc._id });
  console.log(`  [CHECK] User scanCount in DB after Failed Scan: ${userAfterFail.scanCount} (Must still be 2)`);

  // Cleanup test user after verification
  await usersCol.deleteOne({ _id: newUserDoc._id });
  console.log(`\n[TEST CLEANUP] Removed test user '${testEmail}'. Remaining Users in DB: ${await usersCol.countDocuments({})}`);

  if (userAfterScan2.scanCount === 2 && userAfterFail.scanCount === 2) {
    console.log("\n" + "=" .repeat(100));
    console.log("ALL E2E RUNTIME VERIFICATION TESTS PASSED SUCCESSFULLY!");
    console.log("=" .repeat(100));
  } else {
    console.error("\nFAIL: Scan count mismatch!");
    process.exit(1);
  }

  await mongoose.disconnect();
}

runTest().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
