import nodemailer from 'nodemailer';
import dns from 'dns';

// Force Node.js DNS lookup to prioritize IPv4 over IPv6 on Linux cloud hosts (Render) to prevent ENETUNREACH
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {}

const getSmtpCredentials = () => {
  const host = (process.env.EMAIL_HOST || 'smtp.gmail.com').trim();
  const rawPort = parseInt((process.env.EMAIL_PORT || '').trim() || '587');
  const port = host === 'smtp.gmail.com' ? 587 : rawPort;
  const user = (process.env.EMAIL_USER || '').trim();
  let pass = (process.env.EMAIL_PASSWORD || '').trim();
  const from = (process.env.EMAIL_FROM || user || 'HERIXA Verification').trim();

  // Gmail App Password spaces normalization if using Gmail SMTP
  if (host === 'smtp.gmail.com') {
    const stripped = pass.replace(/\s+/g, '');
    if (stripped.length === 16) {
      pass = stripped;
    }
  }

  return { host, port, user, pass, from };
};

export const validateSmtpConfig = (): { configured: boolean; error?: string } => {
  const { host, port, user, pass, from } = getSmtpCredentials();

  if (!host || !port || !user || !pass || !from) {
    const missing = [];
    if (!host) missing.push('EMAIL_HOST');
    if (!port) missing.push('EMAIL_PORT');
    if (!user) missing.push('EMAIL_USER');
    if (!pass) missing.push('EMAIL_PASSWORD');
    if (!from) missing.push('EMAIL_FROM');
    return {
      configured: false,
      error: `Missing required SMTP environment variables: ${missing.join(', ')}`
    };
  }

  if (user === 'your_email@gmail.com' || pass === 'your_app_password') {
    return {
      configured: false,
      error: 'SMTP credentials still set to default placeholder values.'
    };
  }

  return { configured: true };
};

export const logSmtpDiagnostics = () => {
  const { host, port, user, pass, from } = getSmtpCredentials();

  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] HOST=${host}`);
  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] PORT=${port}`);
  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] USER_CONFIGURED=${user !== ''}`);
  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] PASSWORD_CONFIGURED=${pass !== ''}`);
  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] PASSWORD_LENGTH=${pass.length}`);
  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] FROM_CONFIGURED=${from !== ''}`);
};

const dispatchSmtpEmail = async (mailOptions: { from?: string; to: string; subject: string; text: string; html: string }): Promise<boolean> => {
  const { host, port, user, pass, from } = getSmtpCredentials();

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      family: 4,
    } as any);

    const info = await transporter.sendMail({
      from: mailOptions.from || from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      text: mailOptions.text,
      html: mailOptions.html,
    });

    if (info.rejected && info.rejected.length > 0) {
      console.error(`[HERIXA-EMAIL] Recipient email rejected: ${info.rejected.join(', ')}`);
      return false;
    }

    console.log('[HERIXA-EMAIL] EMAIL_SENT_SUCCESSFULLY (Gmail SMTP)');
    return true;
  } catch (error: any) {
    const code = error.code || 'UNKNOWN';
    const responseCode = error.responseCode || 'NONE';
    const message = error.message || String(error);

    console.error('[HERIXA-EMAIL] SMTP_ERROR');
    console.error(`code=${code}`);
    console.error(`responseCode=${responseCode}`);
    console.error(`message=${message}`);
    return false;
  }
};

export const verifySmtpConnection = async (): Promise<boolean> => {
  logSmtpDiagnostics();
  
  const config = validateSmtpConfig();
  if (!config.configured) {
    console.error(`[HERIXA-EMAIL] SMTP Configuration Error: ${config.error}`);
    return false;
  }

  const { host, port, user, pass } = getSmtpCredentials();

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      family: 4,
    } as any);

    await transporter.verify();
    console.log('[HERIXA-EMAIL] SMTP_CONFIGURED');
    console.log('[HERIXA-EMAIL] SMTP_CONNECTION_VERIFIED');
    return true;
  } catch (error: any) {
    console.error('[HERIXA-EMAIL] SMTP Connection Error:', error.message || String(error));
    return false;
  }
};

export const sendOtpEmail = async (email: string, name: string, otp: string, resetToken?: string): Promise<boolean> => {
  const config = validateSmtpConfig();
  if (!config.configured) {
    console.error(`[HERIXA-EMAIL] Email Configuration Error: ${config.error}`);
    return false;
  }

  const { from } = getSmtpCredentials();

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

    return await dispatchSmtpEmail({
      from,
      to: email,
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
  const config = validateSmtpConfig();
  if (!config.configured) {
    console.error(`[HERIXA-EMAIL] Email Configuration Error: ${config.error}`);
    return false;
  }

  const { from } = getSmtpCredentials();

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

    return await dispatchSmtpEmail({
      from,
      to: email,
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
  const config = validateSmtpConfig();
  if (!config.configured) {
    console.warn(`[HERIXA-ADMIN-NOTIF] Email Configuration Warning: ${config.error}`);
    return false;
  }

  const { from } = getSmtpCredentials();
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

    return await dispatchSmtpEmail({
      from,
      to: adminRecipient,
      subject,
      text: textBody,
      html: htmlBody,
    });
  } catch (error: any) {
    console.error('[HERIXA-ADMIN-NOTIF] Safe non-blocking warning: Failed to send admin registration email:', error.message || error);
    return false;
  }
};

