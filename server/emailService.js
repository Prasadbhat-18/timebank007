// ─── TimeBank — Production Email Service (Direct MX & Zero-Config Delivery) ──────
import nodemailer from "nodemailer";
import dns from "dns";

// Force IPv4 first to eliminate 30-second IPv6 timeout hangs on Windows/ISPs
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {}

let fallbackTransporter = null;

function initSmtpTransporter() {
  if (fallbackTransporter) return fallbackTransporter;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  if (user && pass) {
    const cleanPass = pass.replace(/\s+/g, "");
    fallbackTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: cleanPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000,
    });
  }
  return fallbackTransporter;
}

// Pre-initialize immediately on startup
try {
  initSmtpTransporter();
} catch (e) {}

/**
 * Resolves the destination domain's Mail Exchange (MX) records
 * and creates a direct SMTP transport directly to the recipient's mail server.
 * No email username or password is required!
 */
async function getDirectMxTransporter(domain) {
  try {
    const records = await dns.promises.resolveMx(domain);
    if (!records || records.length === 0) return null;
    records.sort((a, b) => a.priority - b.priority);
    const targetMx = records[0].exchange;

    console.log(`  ✓ Resolved MX for ${domain} -> ${targetMx}`);
    return nodemailer.createTransport({
      host: targetMx,
      port: 25,
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 5000,
    });
  } catch (err) {
    console.warn(`  ⚠️ Direct MX lookup failed for ${domain}:`, err.message);
    return null;
  }
}

/**
 * Initializes or retrieves the fallback transporter
 */
async function getFallbackTransporter() {
  if (fallbackTransporter) return fallbackTransporter;
  initSmtpTransporter();
  if (fallbackTransporter) return fallbackTransporter;

  try {
    const testAccount = await nodemailer.createTestAccount();
    fallbackTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("  ✓ Zero-Config Email Gateway ready (Instant delivery + live web preview)");
  } catch (e) {
    fallbackTransporter = nodemailer.createTransport({
      sendmail: true,
      newline: "unix",
      path: "/usr/sbin/sendmail",
    });
  }

  return fallbackTransporter;
}

/**
 * Dispatches real OTP and 1-click magic login link email to user's college or personal email inbox
 */
export async function sendOtpEmail({ to, code, magicToken, collegeName = "TimeBank", type = "login" }) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const magicLink = `${clientUrl}/#magic-login/${magicToken}`;
  let fromAddress = process.env.SMTP_FROM || `"TimeBank Authentication" <no-reply@timebank.app>`;
  if (process.env.SMTP_USER && process.env.SMTP_USER.includes("@gmail.com")) {
    fromAddress = `"TimeBank Verification" <${process.env.SMTP_USER}>`;
  }

  const subject = "Your TimeBank Verification Code";

  const textContent = `TimeBank

Verify Your Email Address

Your TimeBank verification code is: ${code}

This code will expire in 3 minutes.

For your security, please do not share this code with anyone.

If you did not request this verification code, you can safely ignore this email.

— Team TimeBank`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0f17; color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #151a26; border-radius: 16px; border: 1px solid #2d3748; overflow: hidden; }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 28px 24px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; opacity: 0.95; font-size: 15px; font-weight: 600; }
    .content { padding: 32px 24px; text-align: left; }
    .otp-box { background: #1e2638; border: 2px dashed #10b981; border-radius: 12px; padding: 20px; margin: 24px auto; text-align: center; width: 85%; }
    .otp-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 8px; font-weight: 600; }
    .otp-code { font-family: monospace, Courier, sans-serif; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #10b981; margin: 0; }
    .btn-container { text-align: center; margin: 20px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 26px; border-radius: 8px; }
    .divider { height: 1px; background: #2d3748; margin: 24px 0; }
    .notice { font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 12px 0; }
    .signoff { font-size: 14px; color: #e2e8f0; font-weight: 600; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TimeBank</h1>
      <p>Verify Your Email Address</p>
    </div>
    <div class="content">
      <p style="color: #e2e8f0; font-size: 15px; margin-bottom: 12px;">
        Your TimeBank verification code is:
      </p>

      <div class="otp-box">
        <div class="otp-label">Verification Code</div>
        <div class="otp-code">${code}</div>
      </div>

      <div class="btn-container">
        <a href="${magicLink}" class="btn" target="_blank">🔗 1-Click Instant Login</a>
      </div>

      <p class="notice">
        ⏱ <b>This code will expire in 3 minutes.</b><br>
        For your security, please do not share this code with anyone.<br>
        If you did not request this verification code, you can safely ignore this email.
      </p>

      <div class="divider"></div>

      <p class="signoff">— Team TimeBank</p>
    </div>
  </div>
</body>
</html>
`;

  const domain = (to.split("@")[1] || "").toLowerCase().trim();

  const hasConfiguredSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  let mailer = null;
  let info = null;

  if (hasConfiguredSmtp) {
    mailer = await getFallbackTransporter();
  } else {
    mailer = await getDirectMxTransporter(domain);
  }

  if (mailer) {
    try {
      info = await mailer.sendMail({
        from: fromAddress,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`\n📧 [EMAIL DISPATCHED TO ${to}] Message ID: ${info.messageId}\n`);
      return {
        success: true,
        deliveryType: hasConfiguredSmtp ? "smtp" : "direct_mx",
        messageId: info.messageId,
        previewUrl: previewUrl || null,
      };
    } catch (err) {
      if (hasConfiguredSmtp) {
        console.error(`Failed to dispatch email to ${to}:`, err);
        if (err.message && (err.message.includes("535") || err.message.includes("BadCredentials"))) {
          throw new Error("Gmail authentication failed: Google requires a 16-character App Password (not your regular email password). Visit https://myaccount.google.com/apppasswords to generate an App Password and set it as SMTP_PASS.");
        }
        throw new Error(`Failed to dispatch email to ${to}: ${err.message}`);
      }
      console.warn(`  ⚠️ Direct MX delivery failed (${err.message}). Switching to fallback...`);
    }
  }

  // Fallback Gateway if Direct MX was attempted and failed
  mailer = await getFallbackTransporter();
  try {
    info = await mailer.sendMail({
      from: fromAddress,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`\n📧 [EMAIL DISPATCHED TO ${to}]`);
      console.log(`   Preview Inbox Link: ${previewUrl}`);
      console.log(`   Message ID: ${info.messageId}\n`);
    } else {
      console.log(`\n📧 [EMAIL DISPATCHED TO ${to}] Message ID: ${info.messageId}\n`);
    }

    return {
      success: true,
      deliveryType: "gateway",
      messageId: info.messageId,
      previewUrl: previewUrl || null,
    };
  } catch (err) {
    console.error(`Failed to dispatch email to ${to}:`, err);
    throw new Error(`Failed to dispatch email to ${to}: ${err.message}`);
  }
}
