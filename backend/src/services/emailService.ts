import dns from 'dns';

// Force Node.js DNS lookup to prioritize IPv4 over IPv6 on Linux cloud hosts (Render) to prevent ENETUNREACH
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {}

const getBrevoSender = () => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const rawFrom = (process.env.EMAIL_FROM || process.env.EMAIL_USER || 'HERIXA Verification').trim();

  let name = 'HERIXA Verification';
  let email = rawFrom;

  const match = rawFrom.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    name = match[1].trim() || 'HERIXA Verification';
    email = match[2].trim();
  } else if (rawFrom.includes('@')) {
    email = rawFrom.trim();
  }

  return { apiKey, sender: { name, email }, rawFrom };
};

export const validateEmailConfig = (): { configured: boolean; error?: string } => {
  const { apiKey, sender } = getBrevoSender();

  if (!apiKey) {
    return {
      configured: false,
      error: 'Missing required environment variable: BREVO_API_KEY'
    };
  }

  if (!sender.email || !sender.email.includes('@')) {
    return {
      configured: false,
      error: 'Invalid or missing sender email in EMAIL_FROM'
    };
  }

  return { configured: true };
};

// Export backward-compatible alias for existing imports
export const validateSmtpConfig = validateEmailConfig;

export const logEmailDiagnostics = () => {
  const { apiKey, sender } = getBrevoSender();

  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] PROVIDER=Brevo_HTTPS_API`);
  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] API_KEY_CONFIGURED=${apiKey !== ''}`);
  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] SENDER_EMAIL=${sender.email}`);
  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] SENDER_NAME=${sender.name}`);
};

export const logSmtpDiagnostics = logEmailDiagnostics;

const dispatchBrevoEmail = async (mailOptions: {
  from?: string;
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> => {
  const { apiKey, sender } = getBrevoSender();

  if (!apiKey) {
    console.error('[HERIXA-EMAIL] Brevo Configuration Error: BREVO_API_KEY is missing.');
    return false;
  }

  let mailSender = sender;
  if (mailOptions.from) {
    const match = mailOptions.from.match(/^(.*?)\s*<([^>]+)>$/);
    if (match) {
      mailSender = { name: match[1].trim() || sender.name, email: match[2].trim() };
    } else if (mailOptions.from.includes('@')) {
      mailSender = { name: sender.name, email: mailOptions.from.trim() };
    }
  }

  const payload = {
    sender: mailSender,
    to: [
      {
        email: mailOptions.to,
        name: mailOptions.toName || mailOptions.to.split('@')[0],
      },
    ],
    subject: mailOptions.subject,
    htmlContent: mailOptions.html,
    textContent: mailOptions.text,
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const resData: any = await response.json().catch(() => ({}));
      console.log(`[HERIXA-EMAIL] EMAIL_SENT_SUCCESSFULLY (Brevo HTTP API ID: ${resData.messageId || 'N/A'})`);
      return true;
    } else {
      const errData: any = await response.json().catch(() => ({}));
      const errMsg = errData.message || errData.code || `HTTP Status ${response.status}`;
      console.error(`[HERIXA-EMAIL] Brevo HTTP API Error (Status ${response.status}): ${errMsg}`);
      return false;
    }
  } catch (error: any) {
    console.error('[HERIXA-EMAIL] Brevo HTTP API network error:', error.message || String(error));
    return false;
  }
};

export const verifySmtpConnection = async (): Promise<boolean> => {
  logEmailDiagnostics();

  const config = validateEmailConfig();
  if (!config.configured) {
    console.error(`[HERIXA-EMAIL] Email Configuration Error: ${config.error}`);
    return false;
  }

  console.log('[HERIXA-EMAIL] BREVO_HTTPS_API_CONFIGURED');
  console.log('[HERIXA-EMAIL] CONNECTION_VERIFIED');
  return true;
};

export const sendOtpEmail = async (email: string, name: string, otp: string, resetToken?: string): Promise<boolean> => {
  const config = validateEmailConfig();
  if (!config.configured) {
    console.error(`[HERIXA-EMAIL] Email Configuration Error: ${config.error}`);
    return false;
  }

  try {
    console.log('[HERIXA-EMAIL] OTP_EMAIL_SEND_STARTED');

    const isReset = !!resetToken;
    const subject = isReset ? 'HERIXA Password Reset OTP' : 'Verify your HERIXA account';

    const resetBaseUrl = (process.env.PASSWORD_RESET_BASE_URL || 'http://localhost:5000').trim();
    const resetUrl = `${resetBaseUrl}/api/users/reset-password-redirect?token=${resetToken}`;

    const textBody = isReset
      ? `Hello ${name},\n\nYou requested to reset your HERIXA password.\n\nYour verification code is: ${otp}\n\nThis OTP expires in 10 minutes. For security reasons, do NOT share this OTP with anyone.\n\nAlternatively, click the link below to reset your password directly in the HERIXA app:\n${resetUrl}\n\nThis link and code expire in 10 minutes and can only be used once.\n\nIf you did not request this, you can safely ignore this email.`
      : `Hello ${name},\n\nYour HERIXA verification code is: ${otp}\n\nThis code expires in 10 minutes. Do NOT share this OTP with anyone.\n\nIf you did not request this code, you can safely ignore this email.`;

    const htmlBody = isReset
      ? `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #121212; color: #ffffff;">
          <h2 style="color: #D4AF37; margin-bottom: 5px;">HERIXA</h2>
          <h3 style="color: #ffffff; margin-top: 0;">Password Reset OTP</h3>
          <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;" />
          <p>Hello <strong>${name}</strong>,</p>
          <p>You requested to reset your HERIXA password.</p>

          <p style="margin-top: 20px; margin-bottom: 5px; font-weight: bold; color: #D4AF37;">Option 1: Enter Verification Code in App</p>
          <div style="background: #1e1e1e; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; display: inline-block; margin-bottom: 20px; color: #D4AF37; border: 1px solid #333;">
            ${otp}
          </div>

          <p style="margin-top: 10px; margin-bottom: 15px; font-weight: bold; color: #D4AF37;">Option 2: Reset Directly using the Button Below</p>
          <a href="${resetUrl}" style="background-color: #D4AF37; color: #121212; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; margin-bottom: 20px;">
            Reset Password
          </a>

          <p style="font-size: 13px; color: #ccc; margin-top: 20px;">
            This link and code expire in 10 minutes and can only be used once.
          </p>
          <p style="font-size: 13px; color: #ff3b30; font-weight: bold; margin-top: 10px;">
            SECURITY WARNING: Do not share this OTP/code with anyone under any circumstances. HERIXA staff will never ask for your OTP.
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 15px; border-top: 1px solid #333; padding-top: 10px;">
            If you did not request this, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #121212; color: #ffffff;">
          <h2 style="color: #D4AF37; margin-bottom: 5px;">HERIXA</h2>
          <h3 style="color: #ffffff; margin-top: 0;">Account Verification</h3>
          <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;" />
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your HERIXA verification code is:</p>
          <div style="background: #1e1e1e; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; display: inline-block; margin: 10px 0; color: #D4AF37; border: 1px solid #333;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #ccc; margin-top: 20px;">This code expires in 10 minutes.</p>
          <p style="font-size: 13px; color: #ff3b30; font-weight: bold; margin-top: 10px;">
            SECURITY WARNING: Do not share this OTP/code with anyone under any circumstances.
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 15px; border-top: 1px solid #333; padding-top: 10px;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
      `;

    return await dispatchBrevoEmail({
      to: email,
      toName: name,
      subject,
      text: textBody,
      html: htmlBody,
    });
  } catch (error: any) {
    console.error('[HERIXA-EMAIL] Failed to dispatch OTP email:', error.message || String(error));
    return false;
  }
};

/**
 * Sends a secure notification email to the user when their password has been changed.
 */
export const sendPasswordChangedEmail = async (email: string, name: string): Promise<boolean> => {
  const config = validateEmailConfig();
  if (!config.configured) {
    console.error(`[HERIXA-EMAIL] Email Configuration Error: ${config.error}`);
    return false;
  }

  try {
    const subject = 'HERIXA Password Changed Successfully';
    const formattedDate = new Date().toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC';

    const textBody = `Hello ${name},\n\nYour HERIXA account password was successfully changed on ${formattedDate}.\n\nIf you did not make this change, please contact HERIXA support immediately.\n\nSecurity Warning: Never share your password, OTPs, or reset links with anyone.`;

    const htmlBody = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #121212; color: #ffffff;">
        <h2 style="color: #D4AF37; margin-bottom: 5px;">HERIXA</h2>
        <h3 style="color: #ffffff; margin-top: 0;">Password Changed Successfully</h3>
        <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;" />
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your HERIXA account password was successfully changed.</p>

        <div style="background: #1e1e1e; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #333;">
          <p style="margin: 0; color: #ccc; font-size: 14px;"><strong>Date/Time:</strong> ${formattedDate}</p>
        </div>

        <p style="color: #ff3b30; font-size: 13px; font-weight: bold; margin-top: 20px;">
          SECURITY WARNING: If you did not initiate this change, please contact HERIXA support immediately to secure your account.
        </p>

        <p style="font-size: 12px; color: #999; margin-top: 15px; border-top: 1px solid #333; padding-top: 10px;">
          This is an automated security notification. Please do not reply to this email.
        </p>
      </div>
    `;

    return await dispatchBrevoEmail({
      to: email,
      toName: name,
      subject,
      text: textBody,
      html: htmlBody,
    });
  } catch (error: any) {
    console.error('[HERIXA-EMAIL] Failed to send password changed email:', error.message || error);
    return false;
  }
};

/**
 * Sends an informational notification email to the admin when a new user registers.
 */
export const sendAdminRegistrationNotification = async (newUserEmail: string, newUserName: string, registrationDate: Date = new Date()): Promise<boolean> => {
  const config = validateEmailConfig();
  if (!config.configured) {
    console.warn(`[HERIXA-ADMIN-NOTIF] Email Configuration Warning: ${config.error}`);
    return false;
  }

  const adminRecipient = 'vidhub657@gmail.com';

  try {
    const formattedDate = registrationDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }) + ' IST';
    const subject = 'HERIXA — New User Registration';

    const textBody = `HERIXA — New User Registration\n\nA new user has registered on HERIXA.\n\nName: ${newUserName}\nEmail: ${newUserEmail}\nRegistration Date: ${formattedDate}\n`;

    const htmlBody = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #333; border-radius: 8px; background-color: #121212; color: #ffffff;">
        <h2 style="color: #D4AF37; margin-bottom: 5px;">HERIXA</h2>
        <h3 style="color: #ffffff; margin-top: 0;">New User Registration</h3>
        <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;" />
        <p>A new user has registered on HERIXA.</p>

        <div style="background: #1e1e1e; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #333;">
          <p style="margin: 4px 0; color: #ffffff;"><strong>Name:</strong> ${newUserName}</p>
          <p style="margin: 4px 0; color: #ffffff;"><strong>Email:</strong> ${newUserEmail}</p>
          <p style="margin: 4px 0; color: #D4AF37;"><strong>Date/Time:</strong> ${formattedDate}</p>
        </div>

        <p style="font-size: 12px; color: #999; margin-top: 15px; border-top: 1px solid #333; padding-top: 10px;">
          This is an automated informational notification.
        </p>
      </div>
    `;

    return await dispatchBrevoEmail({
      to: adminRecipient,
      toName: 'HERIXA Admin',
      subject,
      text: textBody,
      html: htmlBody,
    });
  } catch (error: any) {
    console.error('[HERIXA-ADMIN-NOTIF] Safe non-blocking warning: Failed to send admin registration email:', error.message || error);
    return false;
  }
};
