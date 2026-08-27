import nodemailer from 'nodemailer';

export const validateSmtpConfig = (): { configured: boolean; error?: string } => {
  const host = (process.env.EMAIL_HOST || '').trim();
  const port = (process.env.EMAIL_PORT || '').trim();
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASSWORD || '').trim();
  const from = (process.env.EMAIL_FROM || '').trim();

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
  const host = (process.env.EMAIL_HOST || '').trim();
  const port = (process.env.EMAIL_PORT || '').trim();
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASSWORD || '').trim();
  const from = (process.env.EMAIL_FROM || '').trim();

  // Normalize password for diagnostics length checking
  let normalizedPass = pass;
  if (host === 'smtp.gmail.com') {
    const stripped = pass.replace(/\s+/g, '');
    // Gmail App Password must be 16 characters
    if (stripped.length === 16) {
      normalizedPass = stripped;
    }
  }

  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] HOST=${host}`);
  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] PORT=${port}`);
  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] USER_CONFIGURED=${user !== ''}`);
  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] PASSWORD_CONFIGURED=${pass !== ''}`);
  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] PASSWORD_LENGTH=${pass.length}`);
  console.log(`[HERIXA-EMAIL-DIAGNOSTIC] FROM_CONFIGURED=${from !== ''}`);
  if (host === 'smtp.gmail.com') {
    console.log(`[HERIXA-EMAIL-DIAGNOSTIC] GMAIL_NORMALIZED_LENGTH=${normalizedPass.length}`);
  }
};

export const verifySmtpConnection = async (): Promise<boolean> => {
  logSmtpDiagnostics();
  
  const config = validateSmtpConfig();
  if (!config.configured) {
    console.error(`[HERIXA-EMAIL] SMTP Configuration Error: ${config.error}`);
    return false;
  }

  const host = (process.env.EMAIL_HOST || '').trim();
  const port = parseInt((process.env.EMAIL_PORT || '').trim() || '587');
  const user = (process.env.EMAIL_USER || '').trim();
  let pass = (process.env.EMAIL_PASSWORD || '').trim();

  // Gmail App Password spaces normalization
  if (host === 'smtp.gmail.com') {
    const stripped = pass.replace(/\s+/g, '');
    if (stripped.length === 16) {
      pass = stripped;
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    await transporter.verify();
    console.log('[HERIXA-EMAIL] SMTP_CONFIGURED');
    console.log('[HERIXA-EMAIL] SMTP_CONNECTION_VERIFIED');
    return true;
  } catch (error: any) {
    const code = error.code || 'UNKNOWN';
    const command = error.command || 'NONE';
    const responseCode = error.responseCode || 'NONE';
    const message = error.message || String(error);

    console.error('[HERIXA-EMAIL] SMTP_ERROR');
    console.error(`code=${code}`);
    console.error(`command=${command}`);
    console.error(`responseCode=${responseCode}`);
    console.error(`message=${message}`);

    const errStr = (message.toLowerCase() + ' ' + code.toLowerCase());

    if (code === 'EAUTH' || responseCode === 535 || errStr.includes('auth') || errStr.includes('login') || errStr.includes('credential')) {
      console.error('[HERIXA-EMAIL] SMTP_AUTH_FAILED');
    } else if (code === 'ETIMEDOUT' || code === 'TIMEOUT' || errStr.includes('timeout')) {
      console.error('[HERIXA-EMAIL] SMTP_TIMEOUT');
    } else if (code === 'ECONNECTION' || code === 'ECONNREFUSED' || code === 'ECONNRESET' || errStr.includes('connection')) {
      console.error('[HERIXA-EMAIL] SMTP_CONNECTION_FAILED');
    } else if (code === 'ENOTFOUND' || errStr.includes('dns') || errStr.includes('notfound')) {
      console.error('[HERIXA-EMAIL] SMTP_DNS_FAILED');
    } else if (errStr.includes('tls') || errStr.includes('ssl') || errStr.includes('secure')) {
      console.error('[HERIXA-EMAIL] SMTP_TLS_FAILED');
    } else {
      console.error('[HERIXA-EMAIL] SMTP_FAILURE');
    }
    return false;
  }
};

export const sendOtpEmail = async (email: string, name: string, otp: string): Promise<boolean> => {
  const config = validateSmtpConfig();
  if (!config.configured) {
    console.error(`[HERIXA-EMAIL] SMTP Configuration Error: ${config.error}`);
    return false;
  }

  const host = (process.env.EMAIL_HOST || '').trim();
  const port = parseInt((process.env.EMAIL_PORT || '').trim() || '587');
  const user = (process.env.EMAIL_USER || '').trim();
  let pass = (process.env.EMAIL_PASSWORD || '').trim();
  const from = (process.env.EMAIL_FROM || '').trim();

  // Gmail App Password spaces normalization
  if (host === 'smtp.gmail.com') {
    const stripped = pass.replace(/\s+/g, '');
    if (stripped.length === 16) {
      pass = stripped;
    }
  }

  console.log('[HERIXA-EMAIL] SMTP_CONFIGURED');

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    // Verify before sending
    await transporter.verify();
    console.log('[HERIXA-EMAIL] SMTP_CONNECTION_VERIFIED');

    console.log('[HERIXA-EMAIL] OTP_EMAIL_SEND_STARTED');

    const mailOptions = {
      from,
      to: email,
      subject: 'Verify your HERIXA account',
      text: `Hello ${name},\n\nYour HERIXA verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, you can ignore this email.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Verify your HERIXA account</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your HERIXA verification code is:</p>
          <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; display: inline-block; margin: 10px 0;">
            ${otp}
          </div>
          <p>This code expires in 10 minutes.</p>
          <p>If you did not request this code, you can ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Check if recipient was rejected
    if (info.rejected && info.rejected.length > 0) {
      console.error(`[HERIXA-EMAIL] Recipient email rejected: ${info.rejected.join(', ')}`);
      return false;
    }

    console.log('[HERIXA-EMAIL] OTP_EMAIL_SENT');
    return true;
  } catch (error: any) {
    const code = error.code || 'UNKNOWN';
    const command = error.command || 'NONE';
    const responseCode = error.responseCode || 'NONE';
    const message = error.message || String(error);

    console.error('[HERIXA-EMAIL] SMTP_ERROR');
    console.error(`code=${code}`);
    console.error(`command=${command}`);
    console.error(`responseCode=${responseCode}`);
    console.error(`message=${message}`);

    const errStr = (message.toLowerCase() + ' ' + code.toLowerCase());

    if (code === 'EAUTH' || responseCode === 535 || errStr.includes('auth') || errStr.includes('login') || errStr.includes('credential')) {
      console.error('[HERIXA-EMAIL] SMTP_AUTH_FAILED');
    } else if (code === 'ETIMEDOUT' || code === 'TIMEOUT' || errStr.includes('timeout')) {
      console.error('[HERIXA-EMAIL] SMTP_TIMEOUT');
    } else if (code === 'ECONNECTION' || code === 'ECONNREFUSED' || code === 'ECONNRESET' || errStr.includes('connection')) {
      console.error('[HERIXA-EMAIL] SMTP_CONNECTION_FAILED');
    } else if (code === 'ENOTFOUND' || errStr.includes('dns') || errStr.includes('notfound')) {
      console.error('[HERIXA-EMAIL] SMTP_DNS_FAILED');
    } else if (errStr.includes('tls') || errStr.includes('ssl') || errStr.includes('secure')) {
      console.error('[HERIXA-EMAIL] SMTP_TLS_FAILED');
    } else {
      console.error('[HERIXA-EMAIL] SMTP_FAILURE');
    }
    return false;
  }
};
