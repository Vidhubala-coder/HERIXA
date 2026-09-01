import 'dotenv/config';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { User } from '../models/user';
import { PasswordReset } from '../models/passwordReset';
import { connectDatabase } from '../config/database';
import { hashPassword, verifyPassword } from './authUtils';
import {
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword
} from '../controllers/userController';

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

async function runTests() {
  console.log('[RECOVERY-TEST] Connecting to database...');
  await connectDatabase();

  const testEmail = 'test_recovery_user@gmail.com';
  const testPassword = 'password123';

  try {
    // Cleanup
    console.log('[RECOVERY-TEST] Cleaning up previous test records...');
    await User.deleteMany({ email: { $in: [testEmail, 'nonexistent_user@gmail.com'] } });
    await PasswordReset.deleteMany({ email: { $in: [testEmail, 'nonexistent_user@gmail.com'] } });

    // Create target test user
    const user = new User({
      name: 'Recovery Test User',
      email: testEmail,
      passwordHash: hashPassword(testPassword),
      role: 'user',
      isEmailVerified: true
    });
    await user.save();
    console.log('✔ Test user created.');

    console.log('\n==================================================');
    console.log('RUNNING PASSWORD RECOVERY & MANAGEMENT TEST CASES');
    console.log('==================================================');

    // 1. Existing user requests forgot password
    console.log('\n--- TEST 1: Forgot Password for Registered Email ---');
    const req1 = { body: { email: testEmail } } as any;
    const res1 = mockResponse();
    await forgotPassword(req1, res1, (err) => { if (err) throw err; });
    console.log(`Status: ${res1.statusCode}`);
    console.log(`Response: ${JSON.stringify(res1.jsonData)}`);
    if (res1.statusCode !== 200 || !res1.jsonData.success) {
      throw new Error('TEST 1 Failed: Forgot password failed for existing user');
    }
    const expectedMsg = 'If an account exists for this email, a verification code has been sent.';
    if (res1.jsonData.message !== expectedMsg) {
      throw new Error(`TEST 1 Failed: Message mismatch. Got: "${res1.jsonData.message}"`);
    }
    console.log('✔ Forgot password returned 200 and generic message.');

    // 2. Unknown email returns same generic response
    console.log('\n--- TEST 2: Forgot Password for Unknown Email ---');
    const req2 = { body: { email: 'nonexistent_user@gmail.com' } } as any;
    const res2 = mockResponse();
    await forgotPassword(req2, res2, (err) => { if (err) throw err; });
    console.log(`Status: ${res2.statusCode}`);
    console.log(`Response: ${JSON.stringify(res2.jsonData)}`);
    if (res2.statusCode !== 200 || !res2.jsonData.success || res2.jsonData.message !== expectedMsg) {
      throw new Error('TEST 2 Failed: Account enumeration protection failed');
    }
    console.log('✔ Unknown email returned same response (no enumeration leak).');

    // 3. OTP generation & stored hashed
    console.log('\n--- TEST 3: OTP Generated and Hashed in Database ---');
    const record3 = await PasswordReset.findOne({ email: testEmail });
    if (!record3) {
      throw new Error('TEST 3 Failed: No PasswordReset record created in database');
    }
    console.log(`otpHash in DB: ${record3.otpHash}`);
    if (record3.otpHash.length !== 64) {
      throw new Error('TEST 3 Failed: OTP hash should be SHA-256 (64 hex characters)');
    }
    console.log('✔ OTP hash stored successfully.');

    // 4. Rate Limiting: requesting twice in 60s
    console.log('\n--- TEST 4: Forgot Password Rate Limiting ---');
    const req4 = { body: { email: testEmail } } as any;
    const res4 = mockResponse();
    await forgotPassword(req4, res4, (err) => { if (err) throw err; });
    console.log(`Status: ${res4.statusCode}`);
    console.log(`Response: ${JSON.stringify(res4.jsonData)}`);
    if (res4.statusCode !== 429) {
      throw new Error('TEST 4 Failed: Rate limit of 60 seconds was not enforced');
    }
    console.log('✔ Second request within 60s blocked with 429.');

    // Hack: retrieve active OTP from DB in DEV logs style or direct read to bypass SMTP verification
    // Since we need to test OTP correctness, we will look up the code.
    // Let's create a custom OTP for manual verification
    console.log('\n--- TEST 5: Wrong OTP Rejected ---');
    const req5 = { body: { email: testEmail, otp: '000000' } } as any;
    const res5 = mockResponse();
    await verifyResetOtp(req5, res5, (err) => { if (err) throw err; });
    console.log(`Status: ${res5.statusCode}`);
    console.log(`Response: ${JSON.stringify(res5.jsonData)}`);
    if (res5.statusCode !== 400 || res5.jsonData.success) {
      throw new Error('TEST 5 Failed: Invalid OTP should be rejected');
    }
    console.log('✔ Wrong OTP rejected.');

    // 6. 5 failed OTP attempts invalidate recovery
    console.log('\n--- TEST 6: OTP Attempt Limit (Max 5) ---');
    // We already did 1 wrong attempt in TEST 5. Let's do 4 more wrong attempts.
    for (let i = 0; i < 4; i++) {
      const resTemp = mockResponse();
      await verifyResetOtp(req5, resTemp, (err) => { if (err) throw err; });
      console.log(`Attempt ${i + 2}: Status: ${resTemp.statusCode}`);
    }
    // The 6th attempt should block with 429
    const res6 = mockResponse();
    await verifyResetOtp(req5, res6, (err) => { if (err) throw err; });
    console.log(`6th Attempt: Status: ${res6.statusCode}`);
    console.log(`6th Attempt Response: ${JSON.stringify(res6.jsonData)}`);
    if (res6.statusCode !== 429) {
      throw new Error('TEST 6 Failed: OTP attempt limit was not enforced');
    }
    console.log('✔ Blocked with 429 after 5 failed attempts.');

    // 7. OTP Expiration
    console.log('\n--- TEST 7: Expired OTP Rejected ---');
    // Clear old reset and create an expired one
    await PasswordReset.deleteMany({ email: testEmail });
    const expiredRecord = new PasswordReset({
      userId: user._id,
      email: testEmail,
      otpHash: crypto.createHash('sha256').update('123456').digest('hex'),
      expiresAt: new Date(Date.now() - 1000), // expired 1s ago
      attempts: 0,
      verified: false
    });
    await expiredRecord.save();
    const req7 = { body: { email: testEmail, otp: '123456' } } as any;
    const res7 = mockResponse();
    await verifyResetOtp(req7, res7, (err) => { if (err) throw err; });
    console.log(`Status: ${res7.statusCode}`);
    console.log(`Response: ${JSON.stringify(res7.jsonData)}`);
    if (res7.statusCode !== 400 || res7.jsonData.message.indexOf('expired') === -1) {
      throw new Error('TEST 7 Failed: Expired OTP was not rejected');
    }
    console.log('✔ Expired OTP rejected.');

    // 8. Correct OTP succeeds and generates reset token
    console.log('\n--- TEST 8 & 9 & 10: Correct OTP Verification & Hashed Token ---');
    await PasswordReset.deleteMany({ email: testEmail });
    const freshRecord = new PasswordReset({
      userId: user._id,
      email: testEmail,
      otpHash: crypto.createHash('sha256').update('123456').digest('hex'),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      verified: false
    });
    await freshRecord.save();
    const req8 = { body: { email: testEmail, otp: '123456' } } as any;
    const res8 = mockResponse();
    await verifyResetOtp(req8, res8, (err) => { if (err) throw err; });
    console.log(`Status: ${res8.statusCode}`);
    console.log(`Response: ${JSON.stringify(res8.jsonData)}`);
    if (res8.statusCode !== 200 || !res8.jsonData.success || !res8.jsonData.resetToken) {
      throw new Error('TEST 8 Failed: Correct OTP did not return resetToken');
    }
    const resetToken = res8.jsonData.resetToken;
    console.log(`Received raw resetToken: ${resetToken}`);
    // Check in database that the token is hashed
    const checkedTokenRecord = await PasswordReset.findOne({ email: testEmail });
    if (!checkedTokenRecord || !checkedTokenRecord.resetTokenHash) {
      throw new Error('TEST 9 Failed: Reset token was not saved to database');
    }
    console.log(`Hashed resetToken in DB: ${checkedTokenRecord.resetTokenHash}`);
    if (checkedTokenRecord.resetTokenHash === resetToken) {
      throw new Error('TEST 9 Failed: SECURITY FAILURE - Plaintext resetToken saved to database');
    }
    console.log('✔ Correct OTP accepted and resetToken stored hashed.');

    // 11. Mismatched passwords rejected
    console.log('\n--- TEST 11: Reset Password Mismatch ---');
    const req11 = { body: { resetToken, newPassword: 'newpassword123', confirmPassword: 'differentpassword' } } as any;
    const res11 = mockResponse();
    await resetPassword(req11, res11, (err) => { if (err) throw err; });
    console.log(`Status: ${res11.statusCode}`);
    if (res11.statusCode !== 400) {
      throw new Error('TEST 11 Failed: Mismatched passwords did not return 400');
    }
    console.log('✔ Password mismatch rejected.');

    // 12. Weak password rejected
    console.log('\n--- TEST 12: Reset Password Weak (Length < 8) ---');
    const req12 = { body: { resetToken, newPassword: 'weak', confirmPassword: 'weak' } } as any;
    const res12 = mockResponse();
    await resetPassword(req12, res12, (err) => { if (err) throw err; });
    console.log(`Status: ${res12.statusCode}`);
    if (res12.statusCode !== 400) {
      throw new Error('TEST 12 Failed: Weak password should be rejected');
    }
    console.log('✔ Weak password rejected.');

    // 13. Same password reuse rejected
    console.log('\n--- TEST 13: Reset Password Same as Current ---');
    const req13 = { body: { resetToken, newPassword: testPassword, confirmPassword: testPassword } } as any;
    const res13 = mockResponse();
    await resetPassword(req13, res13, (err) => { if (err) throw err; });
    console.log(`Status: ${res13.statusCode}`);
    console.log(`Response: ${JSON.stringify(res13.jsonData)}`);
    if (res13.statusCode !== 400) {
      throw new Error('TEST 13 Failed: Same password reuse should be rejected');
    }
    console.log('✔ Current password reuse rejected.');

    // 14. Successful reset
    console.log('\n--- TEST 14: Reset Password Success ---');
    const newPasswordVal = 'newsecurepassword123';
    const req14 = { body: { resetToken, newPassword: newPasswordVal, confirmPassword: newPasswordVal } } as any;
    const res14 = mockResponse();
    await resetPassword(req14, res14, (err) => { if (err) throw err; });
    console.log(`Status: ${res14.statusCode}`);
    if (res14.statusCode !== 200 || !res14.jsonData.success) {
      throw new Error('TEST 14 Failed: Reset password failed for valid parameters');
    }
    // Verify user password hash was updated
    const updatedUser = await User.findOne({ email: testEmail });
    if (!updatedUser || !updatedUser.passwordHash) {
      throw new Error('TEST 14 Failed: User password hash not found');
    }
    if (!verifyPassword(newPasswordVal, updatedUser.passwordHash)) {
      throw new Error('TEST 14 Failed: Updated password hash does not verify');
    }
    console.log('✔ Password reset succeeded and user hash updated.');

    // 15. Used reset token cannot be reused
    console.log('\n--- TEST 15: Used Reset Token Cannot Be Reused ---');
    const res15 = mockResponse();
    await resetPassword(req14, res15, (err) => { if (err) throw err; });
    console.log(`Status: ${res15.statusCode}`);
    if (res15.statusCode !== 400) {
      throw new Error('TEST 15 Failed: Used reset token was accepted');
    }
    console.log('✔ Used reset token reuse rejected.');

    // 16 & 17. Old password fails / New works
    console.log('\n--- TEST 16 & 17: Password Verification Post-Reset ---');
    const oldWorks = verifyPassword(testPassword, updatedUser.passwordHash);
    const newWorks = verifyPassword(newPasswordVal, updatedUser.passwordHash);
    console.log(`Old password works: ${oldWorks} (Expected: false)`);
    console.log(`New password works: ${newWorks} (Expected: true)`);
    if (oldWorks || !newWorks) {
      throw new Error('TEST 16 & 17 Failed: Password verification logic mismatch');
    }
    console.log('✔ Password verification validation matches expectations.');

    // 18. Unauthenticated change-password rejected
    console.log('\n--- TEST 18: Unauthenticated Change-Password ---');
    const req18 = { body: { currentPassword: newPasswordVal, newPassword: 'anothernewpassword123', confirmPassword: 'anothernewpassword123' } } as any;
    const res18 = mockResponse();
    await changePassword(req18, res18, (err) => { if (err) throw err; });
    console.log(`Status: ${res18.statusCode}`);
    if (res18.statusCode !== 401) {
      throw new Error('TEST 18 Failed: Unauthenticated change password request did not return 401');
    }
    console.log('✔ Unauthenticated request rejected.');

    // 19. Incorrect current password rejected
    console.log('\n--- TEST 19: Change-Password Incorrect Current Password ---');
    const req19 = {
      user: updatedUser,
      body: { currentPassword: 'wrongcurrentpassword', newPassword: 'anothernewpassword123', confirmPassword: 'anothernewpassword123' }
    } as any;
    const res19 = mockResponse();
    await changePassword(req19, res19, (err) => { if (err) throw err; });
    console.log(`Status: ${res19.statusCode}`);
    if (res19.statusCode !== 400) {
      throw new Error('TEST 19 Failed: Wrong current password should be rejected');
    }
    console.log('✔ Wrong current password rejected.');

    // 20. Same password reuse rejected in change-password
    console.log('\n--- TEST 20: Change-Password Same Password Reuse ---');
    const req20 = {
      user: updatedUser,
      body: { currentPassword: newPasswordVal, newPassword: newPasswordVal, confirmPassword: newPasswordVal }
    } as any;
    const res20 = mockResponse();
    await changePassword(req20, res20, (err) => { if (err) throw err; });
    console.log(`Status: ${res20.statusCode}`);
    if (res20.statusCode !== 400) {
      throw new Error('TEST 20 Failed: Reuse of current password should be rejected');
    }
    console.log('✔ Current password reuse rejected.');

    // 21. Weak password rejected in change-password
    console.log('\n--- TEST 21: Change-Password Weak Password ---');
    const req21 = {
      user: updatedUser,
      body: { currentPassword: newPasswordVal, newPassword: 'weak', confirmPassword: 'weak' }
    } as any;
    const res21 = mockResponse();
    await changePassword(req21, res21, (err) => { if (err) throw err; });
    console.log(`Status: ${res21.statusCode}`);
    if (res21.statusCode !== 400) {
      throw new Error('TEST 21 Failed: Weak password should be rejected');
    }
    console.log('✔ Weak password rejected.');

    // 22. Successful change-password updates password
    console.log('\n--- TEST 22: Change-Password Success ---');
    const finalPassword = 'finalsecurepassword123';
    const req22 = {
      user: updatedUser,
      body: { currentPassword: newPasswordVal, newPassword: finalPassword, confirmPassword: finalPassword }
    } as any;
    const res22 = mockResponse();
    await changePassword(req22, res22, (err) => { if (err) throw err; });
    console.log(`Status: ${res22.statusCode}`);
    if (res22.statusCode !== 200 || !res22.jsonData.success) {
      throw new Error('TEST 22 Failed: Change password failed with valid parameters');
    }
    const finalUser = await User.findOne({ email: testEmail });
    if (!finalUser || !finalUser.passwordHash || !verifyPassword(finalPassword, finalUser.passwordHash)) {
      throw new Error('TEST 22 Failed: Password was not updated in the database');
    }
    console.log('✔ Change password succeeded.');

    // 23. Direct Link Reset Password
    console.log('\n--- TEST 23: Direct Link Reset Password (bypassing OTP) ---');
    await PasswordReset.deleteMany({ email: testEmail });
    const rawLinkToken = crypto.randomBytes(32).toString('hex');
    const hashedLinkToken = crypto.createHash('sha256').update(rawLinkToken).digest('hex');
    const linkRecord = new PasswordReset({
      userId: user._id,
      email: testEmail,
      otpHash: 'dummy',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      verified: false, // NOT verified via OTP!
      resetTokenHash: hashedLinkToken,
      resetTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });
    await linkRecord.save();

    const linkPassword = 'linksecurepassword123';
    const req23 = { body: { resetToken: rawLinkToken, newPassword: linkPassword, confirmPassword: linkPassword } } as any;
    const res23 = mockResponse();
    await resetPassword(req23, res23, (err) => { if (err) throw err; });
    console.log(`Status: ${res23.statusCode}`);
    if (res23.statusCode !== 200 || !res23.jsonData.success) {
      throw new Error('TEST 23 Failed: Direct link reset password failed');
    }
    const linkUser = await User.findOne({ email: testEmail });
    if (!linkUser || !linkUser.passwordHash || !verifyPassword(linkPassword, linkUser.passwordHash)) {
      throw new Error('TEST 23 Failed: Password hash not updated in database');
    }
    console.log('✔ Direct link reset password succeeded.');

    console.log('\n==================================================');
    console.log('ALL RECOVERY & MANAGEMENT INTEGRATION TESTS PASSED!');
    console.log('==================================================');

  } finally {
    // Cleanup
    await User.deleteMany({ email: { $in: [testEmail, 'nonexistent_user@gmail.com'] } });
    await PasswordReset.deleteMany({ email: { $in: [testEmail, 'nonexistent_user@gmail.com'] } });
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('\n❌ RECOVERY TEST RUN FAILED:', err);
  mongoose.disconnect();
  process.exit(1);
});
