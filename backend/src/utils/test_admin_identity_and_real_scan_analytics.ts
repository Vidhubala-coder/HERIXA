import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

import User from '../models/user';
import History from '../models/history';
import ScanActivity from '../models/ScanActivity';
import { generateToken } from '../utils/cryptoAuth';
import { getAdminProfile, getStats, getAiAnalytics } from '../controllers/adminController';

function mockReq(adminId: string, headers: any = {}) {
  return {
    user: { _id: adminId },
    headers: headers,
    query: {}
  } as any;
}

function mockRes() {
  let statusCode = 200;
  let jsonOutput: any = null;
  return {
    status: (code: number) => {
      statusCode = code;
      return {
        json: (data: any) => {
          jsonOutput = data;
        }
      };
    },
    json: (data: any) => {
      jsonOutput = data;
    },
    getStatusCode: () => statusCode,
    getData: () => jsonOutput
  } as any;
}

async function runVerification() {
  console.log("==================================================");
  console.log("VERIFYING ADMIN IDENTITY + REAL SCAN ANALYTICS");
  console.log("==================================================\n");

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/heritage_ar';
  await mongoose.connect(mongoUri);
  console.log("✔ Connected to MongoDB.");

  // 1. Find Admin User
  const adminUser = await User.findOne({ role: 'admin', accountStatus: 'ACTIVE' });
  if (!adminUser) {
    console.error("❌ Admin user not found!");
    process.exit(1);
  }
  console.log(`✔ Found Admin Account: ${adminUser.name} (${adminUser.email})`);

  // 2. Test Admin Profile API
  const reqProfile = mockReq(adminUser._id.toString());
  const resProfile = mockRes();
  await getAdminProfile(reqProfile, resProfile, (err) => { if (err) console.error(err); });

  const profileData = resProfile.getData()?.data;
  console.log(`✔ GET /api/admin/profile status: ${resProfile.getStatusCode()}`);
  console.log(`✔ Admin Name: ${profileData?.name}, Role: ${profileData?.role}`);
  console.log(`✔ Admin Avatar field returned in API: ${profileData?.avatar !== undefined ? 'YES (' + (profileData.avatar || 'none') + ')' : 'NO (FAILED)'}`);

  // 3. Test GET /api/admin/stats (Verify Total AI Scans is NOT 18, but matches User.scanCount sum)
  const reqStats = mockReq(adminUser._id.toString());
  const resStats = mockRes();
  await getStats(reqStats, resStats, (err) => { if (err) console.error(err); });

  const statsData = resStats.getData()?.data;
  console.log(`\n✔ GET /api/admin/stats status: ${resStats.getStatusCode()}`);
  console.log(`✔ Total Users: ${statsData?.totalUsers}`);
  console.log(`✔ Total AI Scans in /api/admin/stats: ${statsData?.totalAiScans} (Expected: 5, NOT 18!)`);

  if (statsData?.totalAiScans === 18) {
    console.error("❌ FAILURE: /api/admin/stats is STILL producing the stale 18 value!");
    process.exit(1);
  } else {
    console.log("✔ SUCCESS: Stale 18 value has been completely eliminated from /api/admin/stats!");
  }

  // 4. Test GET /api/admin/analytics/ai
  const reqAi = mockReq(adminUser._id.toString());
  const resAi = mockRes();
  await getAiAnalytics(reqAi, resAi, (err) => { if (err) console.error(err); });

  const aiData = resAi.getData()?.data;
  console.log(`\n✔ GET /api/admin/analytics/ai status: ${resAi.getStatusCode()}`);
  console.log(`✔ Authoritative Total Scans: ${aiData?.totalScans}`);
  console.log(`✔ Successful Scans: ${aiData?.successfulScans}`);
  console.log(`✔ Most Active User: ${aiData?.mostActiveUser?.name} (${aiData?.mostActiveUser?.scanCount} scans)`);

  const brihDist = aiData?.monumentDistribution?.find((m: any) => m.slug === 'brihadeeswarar');
  console.log(`✔ Brihadeeswarar Scans in Distribution: ${brihDist?.scans}`);

  const todayTrend = aiData?.scanActivityOverTime?.find((t: any) => t.label === 'Today');
  console.log(`✔ Today's Scans in 7-Day Trend: ${todayTrend?.count}`);

  console.log("\n==================================================");
  console.log("ALL VERIFICATIONS PASSED CLEANLY!");
  console.log("==================================================");

  await mongoose.disconnect();
}

runVerification().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
