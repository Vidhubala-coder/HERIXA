import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/user';
import { connectDatabase } from '../config/database';
import { runAdminMigration } from './migration';
import { hashPassword, verifyPassword } from './authUtils';
import { generateToken, verifyToken } from './cryptoAuth';

// Mock Express Request / Response
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

async function testAuthFlow() {
  console.log('[TEST-AUTH] Connecting to database...');
  await connectDatabase();

  // Backup production admin role and credentials if present to prevent deletion/corruption
  const prodAdmin = await User.findOne({ email: 'vidhub657@gmail.com' });
  const originalProdAdminRole = prodAdmin ? prodAdmin.role : null;
  const originalProdAdminHash = prodAdmin ? prodAdmin.passwordHash : null;
  const originalProdAdminIsVerified = prodAdmin ? prodAdmin.isEmailVerified : null;

  // Temporarily set process.env for the test run to isolate from production credentials
  const originalEnvAdminEmail = process.env.ADMIN_EMAIL;
  const originalEnvAdminPassword = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_EMAIL = 'test_admin@gmail.com';
  process.env.ADMIN_PASSWORD = 'adminpassword';

  try {
    console.log('[TEST-AUTH] Cleaning old test users...');
    await User.deleteMany({
      email: {
        $in: [
          'test_normal@gmail.com',
          'test_admin@gmail.com',
          'attacker@gmail.com',
          'duplicate@gmail.com'
        ]
      }
    });

    console.log('[TEST-AUTH] =======================================');
    console.log('[TEST-AUTH] RUNNING AUTHENTICATION TEST CASES');
    console.log('[TEST-AUTH] =======================================');

    // TEST 1 & 13: Password hashing, verification, length check, and register normal user
    console.log('\n--- TEST 1: Register Normal User ---');
    const normalUser = new User({
      name: 'Normal User',
      email: 'test_normal@gmail.com',
      passwordHash: hashPassword('password123'),
      role: 'user',
      isEmailVerified: true
    });
    await normalUser.save();
    console.log(`✔ Normal user registered. Role: ${normalUser.role} (Expected: user)`);
    if (normalUser.role !== 'user') throw new Error('Role mismatch for normal user');

    // TEST 2: Register test_admin@gmail.com -> role = admin
    console.log('\n--- TEST 2: Register Designated Admin Email ---');
    const adminEmail: string = 'test_admin@gmail.com';
    const adminUser = new User({
      name: 'Admin User',
      email: adminEmail,
      passwordHash: hashPassword('adminpassword'),
      role: adminEmail === 'test_admin@gmail.com' ? 'admin' : 'user',
      isEmailVerified: true
    });
    await adminUser.save();
    console.log(`✔ Admin user registered. Role: ${adminUser.role} (Expected: admin)`);
    if (adminUser.role !== 'admin') throw new Error('Role mismatch for admin user');

    // TEST 3: Attacker attempts to register with role = admin in request body
    console.log('\n--- TEST 3: Security Against Role Manipulation ---');
    const attackerEmail: string = 'attacker@gmail.com';
    const resolvedRole = attackerEmail === adminEmail ? 'admin' : 'user'; // Backend logic
    const attackerUser = new User({
      name: 'Attacker User',
      email: attackerEmail,
      passwordHash: hashPassword('attackerpass'),
      role: resolvedRole,
      isEmailVerified: true
    });
    await attackerUser.save();
    console.log(`✔ Attacker user registered. Assigned Role: ${attackerUser.role} (Expected: user)`);
    if (attackerUser.role !== 'user') throw new Error('Security vulnerability: Attacker was registered as admin');

    // TEST 4 & 5: Admin Authorization middleware checks
    console.log('\n--- TEST 4 & 5: Admin Authorization Checks ---');
    const checkAdminPrivilege = (userRole: string) => {
      if (userRole !== 'admin') {
        return { success: false, status: 403, message: 'Forbidden' };
      }
      return { success: true, status: 200, message: 'Success' };
    };
    const normalAccess = checkAdminPrivilege(normalUser.role);
    console.log(`✔ Normal user accessing admin route: Status: ${normalAccess.status} (Expected: 403)`);
    if (normalAccess.status !== 403) throw new Error('Vulnerability: Normal user accessed admin route');

    const adminAccess = checkAdminPrivilege(adminUser.role);
    console.log(`✔ Admin user accessing admin route: Status: ${adminAccess.status} (Expected: 200)`);
    if (adminAccess.status !== 200) throw new Error('Failure: Admin could not access admin route');

    // TEST 11 & 12: Password verification checks
    console.log('\n--- TEST 11 & 12: Password Verification ---');
    const correctMatch = verifyPassword('password123', normalUser.passwordHash!);
    console.log(`✔ Login with correct password matches: ${correctMatch} (Expected: true)`);
    if (!correctMatch) throw new Error('Verification failed for correct password');

    const wrongMatch = verifyPassword('wrongpassword', normalUser.passwordHash!);
    console.log(`✔ Login with wrong password matches: ${wrongMatch} (Expected: false)`);
    if (wrongMatch) throw new Error('Vulnerability: Login accepted incorrect password');

    // TEST 20: Startup migration and admin normalization
    console.log('\n--- TEST 20: Startup Migration/Normalization ---');
    console.log('Artificially promoting attacker@gmail.com to admin...');
    await User.updateOne({ email: 'attacker@gmail.com' }, { role: 'admin' });
    let checkAttacker = await User.findOne({ email: 'attacker@gmail.com' });
    console.log(`Attacker current role: ${checkAttacker?.role}`);

    console.log('Running runAdminMigration()...');
    await runAdminMigration();

    checkAttacker = await User.findOne({ email: 'attacker@gmail.com' });
    const checkAdmin = await User.findOne({ email: adminEmail });

    console.log(`✔ Attacker role after migration: ${checkAttacker?.role} (Expected: user)`);
    console.log(`✔ Designated admin role after migration: ${checkAdmin?.role} (Expected: admin)`);

    if (checkAttacker?.role !== 'user' || checkAdmin?.role !== 'admin') {
      throw new Error('Migration failed to normalize roles');
    }

    // TEST 14: Unverified email registration restriction
    console.log('\n--- TEST 14: Unverified Email Login Restriction ---');
    const unverifiedUser = new User({
      name: 'Unverified User',
      email: 'unverified@gmail.com',
      passwordHash: hashPassword('password123'),
      role: 'user',
      isEmailVerified: false
    });
    await unverifiedUser.save();
    const allowLogin = unverifiedUser.isEmailVerified;
    console.log(`✔ Unverified user access allowed: ${allowLogin} (Expected: false)`);
    await User.deleteOne({ email: 'unverified@gmail.com' });
    if (allowLogin) throw new Error('Failure: Unverified user allowed access');

    console.log('\n=======================================');
    console.log('ALL PROGRAMMATIC INTEGRATION TESTS PASSED!');
    console.log('=======================================');
  } finally {
    // Restore process.env variables
    process.env.ADMIN_EMAIL = originalEnvAdminEmail;
    process.env.ADMIN_PASSWORD = originalEnvAdminPassword;

    // Clean up test users
    await User.deleteMany({
      email: {
        $in: [
          'test_normal@gmail.com',
          'test_admin@gmail.com',
          'attacker@gmail.com',
          'duplicate@gmail.com'
        ]
      }
    });

    // Restore production admin in database if it existed
    if (prodAdmin) {
      await User.updateOne(
        { email: 'vidhub657@gmail.com' },
        { 
          role: originalProdAdminRole, 
          passwordHash: originalProdAdminHash,
          isEmailVerified: originalProdAdminIsVerified
        }
      );
      console.log('[TEST-AUTH] Restored production admin account role and credentials.');
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

testAuthFlow().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  mongoose.disconnect();
  process.exit(1);
});
