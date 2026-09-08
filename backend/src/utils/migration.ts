import { User } from '../models/user';
import { HeritageStory } from '../models/HeritageStory';
import { hashPassword, verifyPassword } from './authUtils';

/**
 * Normalizes HeritageStory scenes to keep strictly Scene 1 through Scene 9.
 */
export const runStoryScenesCleanup = async () => {
  try {
    const stories = await HeritageStory.find({});
    for (const story of stories) {
      if (story.scenes && story.scenes.length > 0) {
        const filtered = story.scenes.filter(s => s.sceneNumber >= 1 && s.sceneNumber <= 9);
        const uniqueMap = new Map<number, any>();
        filtered.forEach(s => {
          if (!uniqueMap.has(s.sceneNumber)) {
            uniqueMap.set(s.sceneNumber, s);
          }
        });
        const cleaned = Array.from(uniqueMap.values()).sort((a, b) => a.sceneNumber - b.sceneNumber);
        if (cleaned.length !== story.scenes.length) {
          story.scenes = cleaned;
          await story.save();
          console.log(`[MIGRATION] Cleaned scenes for story ${story._id}: preserved ${cleaned.length} scenes (Scene 1 to 9).`);
        }
      }
    }
  } catch (err) {
    console.error('[MIGRATION] Story scenes cleanup error:', err);
  }
};

/**
 * Runs startup migration/normalization to ensure exactly one admin account exists
 * and normalizes HeritageStory scenes.
 */
export const runAdminMigration = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || 'vidhub657@gmail.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'vidhu@1107';

  console.log(`[MIGRATION] Running admin account normalization for: ${adminEmail}`);

  try {
    // 1. Promote or assign role for the designated admin email
    const adminUser = await User.findOne({ email: adminEmail });
    if (adminUser) {
      let modified = false;
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        modified = true;
        console.log(`[MIGRATION] Promoted designated user ${adminEmail} to admin role.`);
      }
      
      // If the admin user has no passwordHash or it does not match the configured env password, update it
      const isMatch = adminUser.passwordHash ? verifyPassword(adminPassword, adminUser.passwordHash) : false;
      if (!adminUser.passwordHash || !isMatch) {
        const hashed = await hashPassword(adminPassword);
        adminUser.passwordHash = hashed;
        modified = true;
        console.log(`[MIGRATION] Updated/Initialized password for designated admin ${adminEmail} to match env configuration.`);
      }

      if (modified) {
        await adminUser.save();
      }
      console.log(`[HERIXA-ADMIN] ADMIN_ACCOUNT_VERIFIED`);
    } else {
      console.log(`[MIGRATION] Admin account ${adminEmail} does not exist yet. Seeding admin account...`);
      const hashed = await hashPassword(adminPassword);
      const newAdmin = new User({
        name: 'Admin Conservator',
        email: adminEmail,
        passwordHash: hashed,
        role: 'admin',
        isEmailVerified: true
      });
      await newAdmin.save();
      console.log(`[MIGRATION] Successfully created and seeded admin account for: ${adminEmail}`);
      console.log(`[HERIXA-ADMIN] ADMIN_ACCOUNT_VERIFIED`);
    }

    // 2. Demote all other users who are currently set to admin
    const unauthorizedAdmins = await User.find({
      email: { $ne: adminEmail },
      role: 'admin'
    });

    if (unauthorizedAdmins.length > 0) {
      for (const user of unauthorizedAdmins) {
        user.role = 'user';
        await user.save();
        console.log(`[MIGRATION] Demoted user ${user.email} from admin to user role.`);
      }
      console.log(`[MIGRATION] Admin normalization completed: demoted ${unauthorizedAdmins.length} unauthorized admin(s).`);
    } else {
      console.log('[MIGRATION] Admin normalization completed: no unauthorized admins found.');
    }

    // 3. Clean up story scenes (Scene 1-9 only)
    await runStoryScenesCleanup();
  } catch (error) {
    console.error('[MIGRATION] Startup admin normalization failed:', error);
  }
};

