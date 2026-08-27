import 'dotenv/config';
import { validateSmtpConfig, verifySmtpConnection, sendOtpEmail } from '../services/emailService';

async function testSmtp() {
  console.log('[SMTP-TEST] Starting SMTP configuration and flow validation...');

  // 1. Validate Config
  const config = validateSmtpConfig();
  if (!config.configured) {
    console.log('[SMTP-TEST] ❌ SMTP Configuration is NOT configured.');
    console.log(`Error message: ${config.error}`);
    console.log('[SMTP-TEST] Health check passed (correctly rejected default/missing configs).');
    process.exit(1);
  }

  console.log('[SMTP-TEST] ✔ SMTP Configuration is valid.');

  // 2. Verify Connection
  console.log('[SMTP-TEST] Verifying SMTP server connection...');
  const connected = await verifySmtpConnection();
  if (!connected) {
    console.log('[SMTP-TEST] ❌ SMTP Connection Verification failed.');
    process.exit(1);
  }

  console.log('[SMTP-TEST] ✔ SMTP Connection Verified successfully.');

  // 3. Try Sending a Test OTP Email if SMTP_TEST_TO is configured
  const testRecipient = process.env.SMTP_TEST_TO;
  if (testRecipient && testRecipient.trim() !== '') {
    console.log(`[SMTP-TEST] Attempting to send test OTP email to: ${testRecipient.trim()}`);
    const sent = await sendOtpEmail(testRecipient.trim(), 'SMTP Tester', '888888');
    if (sent) {
      console.log('[SMTP-TEST] ✔ Test email sent successfully! Please check your inbox.');
    } else {
      console.log('[SMTP-TEST] ❌ Test email delivery failed.');
      process.exit(1);
    }
  } else {
    console.log('[SMTP-TEST] No test recipient specified in SMTP_TEST_TO (skipping send test).');
  }

  process.exit(0);
}

testSmtp().catch((err) => {
  console.error('[SMTP-TEST] Fatal test error:', err);
  process.exit(1);
});
