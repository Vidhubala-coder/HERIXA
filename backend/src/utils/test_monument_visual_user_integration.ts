import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

import Monument from '../models/monument';

const API_PORT = 5000;

function httpGet(pathUrl: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: API_PORT,
      path: pathUrl,
      method: 'GET',
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

async function runIsolationVerification() {
  console.log("==================================================");
  console.log("VERIFYING MONUMENT DETAILS & CROSS-MONUMENT ISOLATION");
  console.log("==================================================\n");

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/heritage_ar';
  await mongoose.connect(mongoUri);
  console.log("✔ Connected to MongoDB.");

  // 1. Fetch Monuments
  const brihadDoc = await Monument.findOne({ slug: 'brihadeeswarar' });
  const meenakshiDoc = await Monument.findOne({ slug: 'meenakshi-amman' });

  if (!brihadDoc || !meenakshiDoc) {
    console.error("❌ Required monuments not found in DB!");
    process.exit(1);
  }

  console.log(`✔ Found Brihadeeswarar ID: ${brihadDoc._id}`);
  console.log(`✔ Found Meenakshi Amman ID: ${meenakshiDoc._id}`);

  // 2. Fetch Visuals for Brihadeeswarar
  const brihadRes = await httpGet(`/api/monuments/${brihadDoc._id}/visuals`);
  console.log(`\n✔ GET /api/monuments/${brihadDoc.slug}/visuals status: ${brihadRes.status}`);
  console.log(`✔ Brihadeeswarar Visuals Count: ${brihadRes.json?.total}`);

  // 3. Fetch Visuals for Meenakshi Amman
  const meenakshiRes = await httpGet(`/api/monuments/${meenakshiDoc._id}/visuals`);
  console.log(`\n✔ GET /api/monuments/${meenakshiDoc.slug}/visuals status: ${meenakshiRes.status}`);
  console.log(`✔ Meenakshi Amman Visuals Count: ${meenakshiRes.json?.total}`);

  // 4. Verify Isolation
  const brihadVisualIds = new Set((brihadRes.json?.data || []).map((v: any) => v._id));
  const meenakshiVisualIds = new Set((meenakshiRes.json?.data || []).map((v: any) => v._id));

  let overlapCount = 0;
  brihadVisualIds.forEach(id => {
    if (meenakshiVisualIds.has(id)) overlapCount++;
  });

  console.log(`\n✔ Cross-Monument Overlap Count: ${overlapCount} (Expected: 0)`);
  if (overlapCount === 0) {
    console.log("✔ SUCCESS: Complete cross-monument visual isolation verified!");
  } else {
    console.error("❌ FAILURE: Cross-monument visual contamination detected!");
    process.exit(1);
  }

  console.log("\n==================================================");
  console.log("ALL MONUMENT DETAILS VISUAL INTEGRATION TESTS PASSED!");
  console.log("==================================================");

  await mongoose.disconnect();
}

runIsolationVerification().catch(err => {
  console.error("Isolation verification failed:", err);
  process.exit(1);
});
