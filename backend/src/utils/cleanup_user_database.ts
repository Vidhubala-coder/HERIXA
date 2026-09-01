import mongoose from 'mongoose';
import User from '../models/user';
import History from '../models/history';

async function runCleanup() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/heritage_ar';
  await mongoose.connect(uri);

  console.log("=" .repeat(80));
  console.log("HERIXA USER DATABASE CLEANUP & RESET");
  console.log("=" .repeat(80));

  const initialUsers = await User.find({});
  console.log(`Initial Total Users Count: ${initialUsers.length}`);
  initialUsers.forEach((u, i) => {
    console.log(`  [${i + 1}] Email: ${u.email} | Role: ${u.role} | Verified: ${u.isEmailVerified}`);
  });

  const preservedEmails = ['thangarajvidhubala@gmail.com', 'vidhub657@gmail.com'];
  const preservedUser = await User.findOne({ email: 'thangarajvidhubala@gmail.com' });
  const adminUser = await User.findOne({ email: 'vidhub657@gmail.com' });

  if (!preservedUser) {
    console.error(`CRITICAL FATAL ERROR: Preserved user 'thangarajvidhubala@gmail.com' not found in database!`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!adminUser) {
    console.log(`[CLEANUP] Admin user 'vidhub657@gmail.com' not found. Seeding admin account...`);
    const { runAdminMigration } = require('./migration');
    await runAdminMigration();
  }

  console.log(`\n[PRESERVED USER FOUND] ID: ${preservedUser._id} | Email: ${preservedUser.email} | Role: ${preservedUser.role}`);

  // Delete all users except preserved user accounts
  const deleteResult = await User.deleteMany({ email: { $nin: preservedEmails } });
  console.log(`\n[CLEANUP DELETED] ${deleteResult.deletedCount} non-preserved user accounts removed.`);

  // Reset scan count and clean scan history for fresh state
  preservedUser.scanCount = 0;
  await preservedUser.save();
  await History.deleteMany({ userId: preservedUser._id });
  console.log(`[RESET COMPLETED] Preserved account scanCount set to 0 and scan history cleared.`);

  // Final Verification
  const finalUsers = await User.find({});
  console.log(`\nFinal Total Users Count: ${finalUsers.length}`);
  finalUsers.forEach((u, i) => {
    console.log(`  [${i + 1}] Email: ${u.email} | Role: ${u.role} | Verified: ${u.isEmailVerified} | Scans: ${u.scanCount ?? 0}`);
  });

  if (finalUsers.length === 2 && finalUsers.some(u => u.email === 'vidhub657@gmail.com' && u.role === 'admin')) {
    console.log("\n>>> VERIFICATION SUCCESSFUL: Preserved user and Admin account (vidhub657@gmail.com) intact. <<<");
  } else {
    console.error("\n>>> VERIFICATION FAILED! <<<");
  }

  await mongoose.disconnect();
}

runCleanup().catch(err => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
