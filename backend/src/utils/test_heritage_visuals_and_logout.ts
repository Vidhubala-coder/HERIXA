import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import http from 'http';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

import User from '../models/user';
import Monument from '../models/monument';
import AuditLog from '../models/AuditLog';

const API_PORT = 5000;

function postMultipartImages(monumentId: string, token: string, filePaths: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const boundary = '--------------------------' + Date.now().toString(16);
    const postDataParts: Buffer[] = [];

    filePaths.forEach((filePath, idx) => {
      const fileName = path.basename(filePath);
      const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="${fileName}"\r\nContent-Type: image/jpeg\r\n\r\n`;
      postDataParts.push(Buffer.from(fileHeader, 'utf-8'));
      postDataParts.push(fs.readFileSync(filePath));
      postDataParts.push(Buffer.from('\r\n', 'utf-8'));
    });
    postDataParts.push(Buffer.from(`--${boundary}--\r\n`, 'utf-8'));

    const bodyBuffer = Buffer.concat(postDataParts);

    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: API_PORT,
      path: `/api/admin/monuments/${monumentId}/visuals`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

function httpGet(pathUrl: string, token?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: API_PORT,
      path: pathUrl,
      method: 'GET',
      headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function httpDelete(pathUrl: string, token?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: API_PORT,
      path: pathUrl,
      method: 'DELETE',
      headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function httpPostJson(pathUrl: string, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const jsonStr = JSON.stringify(body);
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: API_PORT,
      path: pathUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonStr)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(jsonStr);
    req.end();
  });
}

import { generateToken } from '../utils/cryptoAuth';

async function runE2EVerification() {
  console.log("==================================================");
  console.log("E2E TESTING HERITAGE VISUALS & SECURITY PERMISSIONS");
  console.log("==================================================\n");

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/heritage_ar';
  await mongoose.connect(mongoUri);
  console.log("✔ Connected to MongoDB.");

  // 1. Admin Login
  const adminRes = await httpPostJson('/api/users/login', { email: 'vidhub657@gmail.com', password: 'vidhu@1107' });
  const adminToken = adminRes.json.token || adminRes.json.data?.token;
  console.log(`✔ Admin Login Status: ${adminRes.status}, Token received: ${Boolean(adminToken)}`);

  // 2. Normal User Token
  const normalUserDoc = await User.findOne({ role: 'user', accountStatus: 'ACTIVE' });
  if (!normalUserDoc) {
    console.error("❌ Normal user document not found!");
    process.exit(1);
  }
  const userToken = generateToken(normalUserDoc._id.toString());
  console.log(`✔ Normal User Token Generated for: ${normalUserDoc.email} (Role: ${normalUserDoc.role})`);

  // 3. Find Monument
  const monument = await Monument.findOne({ slug: 'brihadeeswarar' });
  if (!monument) {
    console.error("❌ Brihadeeswarar monument document not found!");
    process.exit(1);
  }
  const monId = monument._id.toString();
  console.log(`✔ Found Monument: ${monument.name} (${monId})`);

  // 4. Create 3 temporary test images on disk
  const tmpDir = path.join(__dirname, '../../uploads/tmp_test');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const dummyImagePaths = [
    path.join(tmpDir, 'test_visual_1.jpg'),
    path.join(tmpDir, 'test_visual_2.jpg'),
    path.join(tmpDir, 'test_visual_3.jpg'),
  ];
  const dummyBuffer = Buffer.from('FAKE_JPEG_IMAGE_DATA_HEADER');
  dummyImagePaths.forEach(p => fs.writeFileSync(p, dummyBuffer));

  // 5. Admin Uploads 3 Visuals to POST /api/admin/monuments/:monumentId/visuals
  console.log("\n--- TEST 1: ADMIN MULTI-IMAGE UPLOAD ---");
  const uploadRes = await postMultipartImages(monId, adminToken, dummyImagePaths);
  console.log(`✔ Admin Upload Status: ${uploadRes.status}`);
  console.log(`✔ Upload Response Message: ${uploadRes.json?.message}`);
  console.log(`✔ Uploaded Visuals Count: ${uploadRes.json?.data?.length}`);

  if (uploadRes.status !== 200 || !uploadRes.json?.data || uploadRes.json.data.length !== 3) {
    console.error("❌ Admin multi-image upload failed!", uploadRes.json);
    process.exit(1);
  }
  console.log("✔ Admin Upload Test: PASSED");

  // 6. User GET Visuals via /api/monuments/:monumentId/visuals
  console.log("\n--- TEST 2: USER READ-ONLY GALLERY ACCESS ---");
  const getRes = await httpGet(`/api/monuments/${monId}/visuals`, userToken);
  console.log(`✔ User GET Visuals Status: ${getRes.status}`);
  console.log(`✔ Visuals Count returned to User: ${getRes.json?.total}`);

  if (getRes.status !== 200 || !Array.isArray(getRes.json?.data) || getRes.json.data.length < 3) {
    console.error("❌ User GET visuals failed!", getRes.json);
    process.exit(1);
  }
  console.log("✔ User Read-Only Gallery Test: PASSED");

  // 7. Security Test: Normal User attempts POST (Upload) -> Expected 403 Forbidden
  console.log("\n--- TEST 3: SECURITY AUTHORIZATION (NORMAL USER UPLOAD) ---");
  const userUploadRes = await postMultipartImages(monId, userToken, [dummyImagePaths[0]]);
  console.log(`✔ Normal User Upload Status Code: ${userUploadRes.status} (Expected: 403)`);
  if (userUploadRes.status === 403) {
    console.log("✔ Security Authorization Test (POST): PASSED");
  } else {
    console.error("❌ Security failure! Normal user was NOT forbidden from uploading!");
    process.exit(1);
  }

  // 8. Admin Deletes 1 Visual via DELETE /api/admin/monuments/:monumentId/visuals/:visualId
  console.log("\n--- TEST 4: ADMIN DELETE VISUAL ---");
  const uploadedVisuals = uploadRes.json.data;
  const targetDeleteId = uploadedVisuals[0]._id;

  const deleteRes = await httpDelete(`/api/admin/monuments/${monId}/visuals/${targetDeleteId}`, adminToken);
  console.log(`✔ Admin Delete Status: ${deleteRes.status}`);
  console.log(`✔ Delete Message: ${deleteRes.json?.message}`);

  if (deleteRes.status !== 200) {
    console.error("❌ Admin visual delete failed!", deleteRes.json);
    process.exit(1);
  }

  // Verify updated count in GET visuals
  const getAfterDeleteRes = await httpGet(`/api/monuments/${monId}/visuals`);
  console.log(`✔ Visuals count after delete: ${getAfterDeleteRes.json?.total}`);
  console.log("✔ Admin Delete Visual Test: PASSED");

  // 9. Security Test: Normal User attempts DELETE -> Expected 403 Forbidden
  console.log("\n--- TEST 5: SECURITY AUTHORIZATION (NORMAL USER DELETE) ---");
  const remainingVisualId = uploadedVisuals[1]._id;
  const userDeleteRes = await httpDelete(`/api/admin/monuments/${monId}/visuals/${remainingVisualId}`, userToken);
  console.log(`✔ Normal User Delete Status Code: ${userDeleteRes.status} (Expected: 403)`);
  if (userDeleteRes.status === 403) {
    console.log("✔ Security Authorization Test (DELETE): PASSED");
  } else {
    console.error("❌ Security failure! Normal user was NOT forbidden from deleting!");
    process.exit(1);
  }

  // 10. Audit Log Verification
  console.log("\n--- TEST 6: AUDIT LOG VERIFICATION ---");
  const addAudit = await AuditLog.findOne({ event: 'HERITAGE_VISUAL_ADDED' });
  const delAudit = await AuditLog.findOne({ event: 'HERITAGE_VISUAL_DELETED' });
  console.log(`✔ HERITAGE_VISUAL_ADDED audit log present: ${Boolean(addAudit)}`);
  console.log(`✔ HERITAGE_VISUAL_DELETED audit log present: ${Boolean(delAudit)}`);

  console.log("\n==================================================");
  console.log("ALL HERITAGE VISUAL & SECURITY E2E TESTS PASSED!");
  console.log("==================================================");

  // Cleanup tmp files
  dummyImagePaths.forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
  if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);

  await mongoose.disconnect();
}

runE2EVerification().catch(err => {
  console.error("E2E verification error:", err);
  process.exit(1);
});
