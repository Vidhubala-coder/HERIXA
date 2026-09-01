import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/user';
import { generateToken } from './cryptoAuth';
import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/heritage_ar';

async function testAdminAvatarAndIdentity() {
  console.log('================================================================================');
  console.log('HERIXA ADMIN AVATAR & DYNAMIC DASHBOARD IDENTITY E2E VERIFICATION');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('[DB CONNECTED] Connected to MongoDB.');

  try {
    // 1. Find or verify Admin user
    let adminUser = await User.findOne({ email: 'vidhub657@gmail.com' });
    if (!adminUser) {
      adminUser = await User.findOne({ role: 'admin' });
    }

    if (!adminUser) {
      throw new Error('No admin user found in database!');
    }

    console.log(`\n[STEP 1: ADMIN USER FOUND] Email: ${adminUser.email} | Role: ${adminUser.role}`);

    const adminToken = generateToken(adminUser._id.toString());

    // 2. Fetch Admin Profile via API
    const profileRes = await fetch(`${BASE_URL}/api/admin/profile`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const profileData: any = await profileRes.json();
    console.log(`\n[STEP 2: FETCH ADMIN PROFILE API] Status: ${profileRes.status}`);
    console.log(`  Name: ${profileData.data?.name} | Email: ${profileData.data?.email} | Role: ${profileData.data?.role}`);
    console.log(`  Avatar: ${profileData.data?.avatar || 'None'}`);

    if (profileRes.status !== 200 || !profileData.success) {
      throw new Error('Failed to fetch admin profile via API!');
    }

    // 3. Upload Admin Avatar Picture via FormData multipart upload
    console.log(`\n[STEP 3: UPLOAD ADMIN AVATAR IMAGE]`);
    const avatarSamplePath = path.resolve(__dirname, '../../../ai/dataset/multiclass_v2/validation/brihadeeswarar/Brihadeewsar_temple.jpg');
    
    if (!fs.existsSync(avatarSamplePath)) {
      throw new Error(`Sample image for avatar test not found at: ${avatarSamplePath}`);
    }

    const fileBuf = fs.readFileSync(avatarSamplePath);
    const blob = new Blob([fileBuf], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('avatar', blob, 'test_admin_avatar.jpg');

    const uploadRes = await fetch(`${BASE_URL}/api/admin/profile/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
      body: formData,
    });

    const uploadData: any = await uploadRes.json();
    console.log(`  Upload HTTP Status: ${uploadRes.status}`);
    console.log(`  Upload Response Success: ${uploadData.success}`);
    console.log(`  Updated Avatar Path: ${uploadData.data?.avatar}`);

    if (uploadRes.status !== 200 || !uploadData.success || !uploadData.data?.avatar) {
      throw new Error('Admin avatar upload failed!');
    }

    // 4. Update Admin Profile Details (Username change test)
    console.log(`\n[STEP 4: UPDATE ADMIN USERNAME]`);
    const updatedName = 'Thangaraj Vidhubala';
    const updateRes = await fetch(`${BASE_URL}/api/admin/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: updatedName })
    });
    const updateData: any = await updateRes.json();
    console.log(`  Update HTTP Status: ${updateRes.status}`);
    console.log(`  Updated Name: ${updateData.data?.name}`);
    console.log(`  Role Preserved: ${updateData.data?.role}`);

    if (updateRes.status !== 200 || updateData.data?.name !== updatedName || updateData.data?.role !== 'admin') {
      throw new Error('Admin username update failed or role mutated!');
    }

    // 5. Verify Persistent State in MongoDB
    console.log(`\n[STEP 5: MONGO DB PERSISTENCE & SECURITY CHECK]`);
    const dbUser = await User.findById(adminUser._id);
    console.log(`  MongoDB User Name: ${dbUser?.name} (Expected: ${updatedName})`);
    console.log(`  MongoDB User Avatar: ${dbUser?.avatar}`);
    console.log(`  MongoDB User Role: ${dbUser?.role} (Expected: admin)`);

    if (dbUser?.name !== updatedName || !dbUser?.avatar || dbUser?.role !== 'admin') {
      throw new Error('Database persistence verification failed!');
    }

    console.log('\n================================================================================');
    console.log('ALL ADMIN AVATAR & DYNAMIC DASHBOARD IDENTITY TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================================');

  } catch (err: any) {
    console.error('\n[TEST FAILURE]:', err.message || err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testAdminAvatarAndIdentity();
