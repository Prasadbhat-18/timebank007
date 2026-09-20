// ─── TimeBank — Production Email Service ─────────────────────────────────────
import "dotenv/config";
import nodemailer from "nodemailer";
import dns from "dns";

// Force IPv4 first to eliminate 30-second IPv6 timeout hangs on Windows/ISPs
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {}

let smtpTransporter = null;
let fallbackTransporter = null;

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    const cleanPass = pass.replace(/\s+/g, "");
    if (host.includes("gmail") || user.toLowerCase().endsWith("@gmail.com")) {
      smtpTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass: cleanPass },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
      });
    } else {
      const port = parseInt(process.env.SMTP_PORT || "587", 10);
      smtpTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass: cleanPass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
      });
    }
  }
  return smtpTransporter;
}

/**
 * Ethereal test fallback (for when SMTP creds are missing/wrong)
 */
async function getFallbackTransporter() {
  if (fallbackTransporter) return fallbackTransporter;
  try {
    const testAccount = await nodemailer.createTestAccount();
    fallbackTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log("  ✓ Ethereal fallback email gateway ready");
  } catch (e) {
    console.warn("  ⚠️ Could not create Ethereal test account:", e.message);
  }
  return fallbackTransporter;
}

/**
 * Low-level email dispatcher using primary SMTP (Gmail) with Ethereal fallback
 */
async function dispatchEmail({ to, subject, text, html }) {
  let fromAddress = process.env.SMTP_FROM || `"TimeBank" <no-reply@timebank.app>`;
  if (process.env.SMTP_USER && process.env.SMTP_USER.includes("@gmail.com")) {
    fromAddress = `"TimeBank Verification" <${process.env.SMTP_USER}>`;
  }

  const hasConfiguredSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

  // 1. Try real configured SMTP (Gmail) first
  if (hasConfiguredSmtp) {
    const smtpMailer = getSmtpTransporter();
    if (smtpMailer) {
      try {
        const info = await smtpMailer.sendMail({
          from: fromAddress,
          to,
          subject,
          text,
          html,
        });
        console.log(`\n📧 [SMTP EMAIL SENT TO ${to}] Subject: "${subject}" | Message ID: ${info.messageId}\n`);
        return {
          success: true,
          deliveryType: "smtp",
          messageId: info.messageId,
          previewUrl: null,
        };
      } catch (err) {
        console.error(`⚠️ SMTP delivery failed for ${to}:`, err.message);
      }
    }
  }

  // 2. Ethereal fallback (preview for test environments)
  const fallbackMailer = await getFallbackTransporter();
  if (!fallbackMailer) {
    throw new Error(`SMTP not configured and fallback unavailable. Could not dispatch email to ${to}.`);
  }
  try {
    const info = await fallbackMailer.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`\n📧 [ETHEREAL PREVIEW for ${to}] Preview URL: ${previewUrl}\n`);
    }
    return {
      success: true,
      deliveryType: "ethereal",
      messageId: info.messageId,
      previewUrl: previewUrl || null,
    };
  } catch (err) {
    throw new Error(`Failed to dispatch email to ${to}: ${err.message}`);
  }
}

/**
 * Dispatches OTP email to user's inbox via configured SMTP (Gmail)
 */
export async function sendOtpEmail({ to, code, magicToken, collegeName = "TimeBank", type = "login" }) {
  const clientUrl = process.env.CLIENT_URL || process.env.URL || "https://timebank017.netlify.app";
  const magicLink = `${clientUrl}/#magic-login/${magicToken}`;
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

  return dispatchEmail({ to, subject, text: textContent, html: htmlContent });
}

/**
 * Dispatches a real-time email to a student when their college admin approves or rejects their ID card
 */
export async function sendStudentApprovalDecisionEmail({ to, studentName = "Student", collegeName = "Your Institution", decision, note = "" }) {
  const clientUrl = process.env.CLIENT_URL || process.env.URL || "https://timebank017.netlify.app";
  const isApproved = decision === "approved";

  const subject = isApproved
    ? `🎉 Your TimeBank Student Account Has Been Approved! - ${collegeName}`
    : `TimeBank Application Update: Student Verification Decision - ${collegeName}`;

  const textContent = isApproved
    ? `Congratulations ${studentName}!

Your student account and college ID verification for ${collegeName} have been officially approved by your college administration.

You can now sign in to TimeBank with your email and access all features:
- 10 Starter Time Credits in your wallet
- AICTE Activity Points Logging with QR-verifiable blockchain credentials
- Peer-to-peer Skill Exchanges and instant bookings

${note ? `Admin Note: "${note}"\n\n` : ""}
Sign in at: ${clientUrl}/#auth

— Team TimeBank`
    : `Hello ${studentName},

Your student account application for ${collegeName} could not be approved at this time.

Reason / Feedback from College Administrator:
${note || "Your uploaded ID card could not be validated against current institution records."}

If you believe this was an error, please reach out to your college administrator or re-apply with a clear, valid college ID card.

Visit TimeBank: ${clientUrl}/#auth

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
    .header-approved { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 28px 24px; text-align: center; color: white; }
    .header-rejected { background: linear-gradient(135deg, #b91c1c 0%, #ef4444 100%); padding: 28px 24px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; opacity: 0.95; font-size: 15px; font-weight: 600; }
    .content { padding: 32px 24px; text-align: left; }
    .status-card { background: #1e2638; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1); }
    .btn-container { text-align: center; margin: 26px 0; }
    .btn-green { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 13px 28px; border-radius: 8px; }
    .btn-red { display: inline-block; background: #ef4444; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 13px 28px; border-radius: 8px; }
    .divider { height: 1px; background: #2d3748; margin: 24px 0; }
    .note-box { background: rgba(255,255,255,0.03); border-left: 4px solid #10b981; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
    .note-box-red { background: rgba(239,68,68,0.08); border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
    .signoff { font-size: 14px; color: #e2e8f0; font-weight: 600; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="${isApproved ? "header-approved" : "header-rejected"}">
      <h1>${isApproved ? "🎓 TimeBank Verified" : "⚠️ Application Update"}</h1>
      <p>${isApproved ? "Student Account Approved!" : "Student Verification Decision"}</p>
    </div>
    <div class="content">
      <h2 style="color: #ffffff; font-size: 19px; margin-top: 0;">
        ${isApproved ? `Congratulations, ${studentName}! 🎉` : `Hello ${studentName},`}
      </h2>

      ${isApproved ? `
        <p style="color: #cbd5e1; font-size: 14.5px; line-height: 1.6;">
          Your college ID card and student verification application for <b>${collegeName}</b> have been officially reviewed and <b style="color: #34d399;">APPROVED</b> by your college administration!
        </p>

        <div class="status-card" style="border-color: rgba(16, 185, 129, 0.4);">
          <div style="font-weight: 700; color: #10b981; margin-bottom: 10px; font-size: 14px;">✨ Your account is now fully unlocked:</div>
          <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13.5px; line-height: 1.8;">
            <li><b>10 Starter Credits</b> added to your decentralized wallet</li>
            <li><b>AICTE Activity Points Integration</b> active with QR-verifiable certificate issuance</li>
            <li><b>Biometric Security Profile</b> enrolled & linked to ${collegeName}</li>
          </ul>
        </div>

        ${note ? `
          <div class="note-box">
            <span style="font-size: 11.5px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px;">Note from College Administrator:</span>
            <p style="margin: 4px 0 0; color: #f1f5f9; font-style: italic; font-size: 13.5px;">"${note}"</p>
          </div>
        ` : ""}

        <div class="btn-container">
          <a href="${clientUrl}/#auth" class="btn-green" target="_blank">Sign In to Your Student Account 🚀</a>
        </div>
      ` : `
        <p style="color: #cbd5e1; font-size: 14.5px; line-height: 1.6;">
          Your student account verification application for <b>${collegeName}</b> was reviewed by your college administration and could not be approved at this time.
        </p>

        <div class="note-box-red">
          <div style="font-size: 12px; text-transform: uppercase; color: #f87171; font-weight: 700; margin-bottom: 4px;">Reason from College Administrator:</div>
          <div style="color: #fca5a5; font-size: 13.5px; line-height: 1.5;">
            ${note || "Your uploaded college ID card could not be validated against current institution enrollment records."}
          </div>
        </div>

        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
          If you believe this decision was made in error, please contact your college administrator or re-apply with a clear, valid college ID card.
        </p>

        <div class="btn-container">
          <a href="${clientUrl}/#auth" class="btn-red" target="_blank">Review Details in Portal →</a>
        </div>
      `}

      <div class="divider"></div>
      <p class="signoff">— Team TimeBank & ${collegeName} Administration</p>
    </div>
  </div>
</body>
</html>
`;

  return dispatchEmail({ to, subject, text: textContent, html: htmlContent });
}

/**
 * Dispatches an email to the college administrator when a new student uploads their ID card
 */
export async function sendCollegeAdminPendingStudentEmail({ to, adminName = "Administrator", studentName, studentEmail, collegeName, collegeIdNumber }) {
  const clientUrl = process.env.CLIENT_URL || process.env.URL || "https://timebank017.netlify.app";
  const subject = `🎓 New Student Verification Request: ${studentName} - TimeBank`;

  const textContent = `Hello ${adminName},

A new student has registered and uploaded their college ID card for verification under ${collegeName}:

- Student Name: ${studentName}
- Student Email: ${studentEmail}
- College USN / ID: ${collegeIdNumber || "Not specified"}
- Institution: ${collegeName}

Please log in to your College Admin portal to review their ID card and approve or reject their access:
${clientUrl}/#college-admin

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
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 28px 24px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
    .header p { margin: 4px 0 0; opacity: 0.95; font-size: 14px; }
    .content { padding: 32px 24px; text-align: left; }
    .info-table { width: 100%; border-collapse: collapse; margin: 18px 0; background: #1a2234; border-radius: 10px; border: 1px solid rgba(59,130,246,0.3); overflow: hidden; }
    .info-table td { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13.5px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14.5px; padding: 12px 28px; border-radius: 8px; }
    .signoff { font-size: 13.5px; color: #94a3b8; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🪪 New Student Verification Request</h1>
      <p>${collegeName}</p>
    </div>
    <div class="content">
      <p style="color: #e2e8f0; font-size: 15px; margin-top: 0;">
        Hello <b>${adminName}</b>, a new student has uploaded their college ID card and is waiting for your verification:
      </p>

      <table class="info-table">
        <tr>
          <td style="color: #94a3b8; width: 140px;">Student Name</td>
          <td style="color: #fff; font-weight: 700;">${studentName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">Email Address</td>
          <td style="color: #38bdf8;">${studentEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">College ID / USN</td>
          <td style="color: #fff;">${collegeIdNumber || "Not specified"}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">College</td>
          <td style="color: #fff;">${collegeName}</td>
        </tr>
      </table>

      <div style="text-align: center; margin: 26px 0;">
        <a href="${clientUrl}/#college-admin" class="btn" target="_blank">Review & Verify in Admin Portal →</a>
      </div>

      <p class="signoff">— Team TimeBank</p>
    </div>
  </div>
</body>
</html>
`;

  return dispatchEmail({ to, subject, text: textContent, html: htmlContent });
}

/**
 * Dispatches an alert email to college admin when a student submits an AICTE activity for verification
 */
export async function sendCollegeAdminPendingAicteEmail({ to, adminName = "Administrator", studentName, studentEmail, collegeName, collegeIdNumber, activityType, activityTitle, organizer, aiScore, aiFeedback }) {
  const clientUrl = process.env.CLIENT_URL || process.env.URL || "https://timebank017.netlify.app";
  const subject = `🎓 New AICTE Activity Claim: ${studentName} (${activityTitle}) - TimeBank`;

  const textContent = `Hello ${adminName},

A student has submitted a new activity for AICTE accreditation and Time Credit verification under ${collegeName}:

- Student: ${studentName} (${studentEmail})
- USN / College ID: ${collegeIdNumber || "Not specified"}
- Activity Title: ${activityTitle}
- Activity Type: ${activityType}
- Organizer: ${organizer || "N/A"}
${aiScore !== null && aiScore !== undefined ? `- AI Genuineness Score: ${aiScore}%\n- AI Audit Feedback: ${aiFeedback || "N/A"}` : ""}

Please review this activity and certificate in your Institution Admin Portal:
${clientUrl}/#college-admin

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
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 50%, #3b82f6 100%); padding: 28px 24px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
    .header p { margin: 4px 0 0; opacity: 0.95; font-size: 14px; }
    .content { padding: 30px 24px; text-align: left; }
    .info-table { width: 100%; border-collapse: collapse; margin: 18px 0; background: #1a2234; border-radius: 10px; border: 1px solid rgba(16,185,129,0.3); overflow: hidden; }
    .info-table td { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13.5px; }
    .ai-box { background: rgba(139, 92, 246, 0.12); border: 1px solid rgba(139, 92, 246, 0.35); border-radius: 10px; padding: 14px 16px; margin: 16px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14.5px; padding: 12px 28px; border-radius: 8px; }
    .signoff { font-size: 13.5px; color: #94a3b8; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 AICTE Activity Verification Request</h1>
      <p>${collegeName}</p>
    </div>
    <div class="content">
      <p style="color: #e2e8f0; font-size: 15px; margin-top: 0;">
        Hello <b>${adminName}</b>, a student has submitted an external activity for AICTE points and bonus Time Credits:
      </p>

      <table class="info-table">
        <tr>
          <td style="color: #94a3b8; width: 140px;">Student Name</td>
          <td style="color: #fff; font-weight: 700;">${studentName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">Student Email</td>
          <td style="color: #38bdf8;">${studentEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">USN / ID</td>
          <td style="color: #fff;">${collegeIdNumber || "Not specified"}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">Activity Title</td>
          <td style="color: #34d399; font-weight: 700;">${activityTitle}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">Activity Type</td>
          <td style="color: #fff;">${activityType}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">Organizer</td>
          <td style="color: #fff;">${organizer || "N/A"}</td>
        </tr>
      </table>

      ${aiScore !== null && aiScore !== undefined ? `
      <div class="ai-box">
        <div style="font-weight: 700; font-size: 13.5px; color: #c084fc; margin-bottom: 4px;">
          🤖 Automated AI Certificate Audit: ${aiScore}% Match
        </div>
        <div style="color: #cbd5e1; font-size: 12.5px; line-height: 1.45;">
          ${aiFeedback || "Certificate scanned and evaluated against student name and event metadata."}
        </div>
      </div>
      ` : ""}

      <div style="text-align: center; margin: 26px 0;">
        <a href="${clientUrl}/#college-admin" class="btn" target="_blank">Review & Approve in Institution Admin Portal →</a>
      </div>

      <p class="signoff">— Team TimeBank</p>
    </div>
  </div>
</body>
</html>
`;

  return dispatchEmail({ to, subject, text: textContent, html: htmlContent });
}

/**
 * Dispatches an email to the student when their AICTE activity is approved or rejected
 */
export async function sendStudentAicteDecisionEmail({ to, studentName, activityTitle, decision, pts = 0, credits = 0, collegeName, adminFeedback = "", txHash = "" }) {
  const clientUrl = process.env.CLIENT_URL || process.env.URL || "https://timebank017.netlify.app";
  const isApproved = decision === "approved";
  const subject = isApproved 
    ? `🎉 AICTE Activity Approved: ${activityTitle} (+${pts} pts, +${credits} cr) - TimeBank`
    : `TimeBank Application Update: AICTE Activity Review - ${activityTitle}`;

  const textContent = isApproved
    ? `Congratulations ${studentName}!

Your college administrator at ${collegeName || "your institution"} has reviewed and approved your AICTE activity: "${activityTitle}".

Accreditation Summary:
- AICTE Activity Points: +${pts} pts awarded
- Time Credits Minted: +${credits} credits added to your balance
${txHash ? `- Polygon Blockchain Tx: https://amoy.polygonscan.com/tx/${txHash}` : ""}

Log in to TimeBank to view your updated credentials and download your verifiable certificate:
${clientUrl}/#aicte

— Team TimeBank`
    : `Hello ${studentName},

Your college administrator at ${collegeName || "your institution"} has reviewed your AICTE activity: "${activityTitle}".

Decision: Not Approved
${adminFeedback ? `Administrator Note: ${adminFeedback}` : "The uploaded documentation or details did not meet the criteria for this category."}

You may submit revised documentation or discuss with your faculty coordinator.

${clientUrl}/#aicte

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
    .header { background: ${isApproved ? "linear-gradient(135deg, #059669 0%, #10b981 100%)" : "linear-gradient(135deg, #991b1b 0%, #ef4444 100%)"}; padding: 28px 24px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
    .header p { margin: 4px 0 0; opacity: 0.95; font-size: 14px; }
    .content { padding: 30px 24px; text-align: left; }
    .badge-card { background: rgba(${isApproved ? "16,185,129" : "239,68,68"}, 0.1); border: 1.5px solid rgba(${isApproved ? "16,185,129" : "239,68,68"}, 0.35); border-radius: 12px; padding: 18px 20px; margin: 18px 0; }
    .btn { display: inline-block; background: ${isApproved ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "#374151"}; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14.5px; padding: 12px 28px; border-radius: 8px; }
    .signoff { font-size: 13.5px; color: #94a3b8; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isApproved ? "🎉 AICTE Activity Approved!" : "📋 AICTE Activity Update"}</h1>
      <p>${collegeName || "Accredited Institution"}</p>
    </div>
    <div class="content">
      <p style="color: #e2e8f0; font-size: 15px; margin-top: 0;">
        Hello <b>${studentName}</b>,
      </p>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
        ${isApproved 
          ? `Your submission for <b>"${activityTitle}"</b> has been officially approved by your institution coordinator.` 
          : `Your submission for <b>"${activityTitle}"</b> was reviewed by your institution coordinator.`}
      </p>

      <div class="badge-card">
        <div style="font-weight: 800; font-size: 15px; color: ${isApproved ? "#34d399" : "#f87171"}; margin-bottom: 8px;">
          ${isApproved ? "✓ Official Verification Completed" : "Decision: Not Approved"}
        </div>
        ${isApproved ? `
        <div style="display: flex; gap: 16px; margin-top: 10px;">
          <div style="background: rgba(0,0,0,0.3); padding: 8px 14px; border-radius: 8px;">
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">AICTE Points</div>
            <div style="font-size: 20px; font-weight: 800; color: #c084fc;">+${pts} pts</div>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 8px 14px; border-radius: 8px;">
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Bonus Credits</div>
            <div style="font-size: 20px; font-weight: 800; color: #34d399;">+${credits} cr</div>
          </div>
        </div>
        ` : `
        <div style="color: #e2e8f0; font-size: 13px; line-height: 1.45;">
          ${adminFeedback || "The activity details did not meet the validation requirements. Please consult your institution advisor."}
        </div>
        `}
      </div>

      ${txHash ? `
      <p style="font-size: 12.5px; color: #94a3b8;">
        Polygon Blockchain Record: <a href="https://amoy.polygonscan.com/tx/${txHash}" target="_blank" style="color: #38bdf8;">View on Polygonscan ↗</a>
      </p>
      ` : ""}

      <div style="text-align: center; margin: 26px 0;">
        <a href="${clientUrl}/#aicte" class="btn" target="_blank">Open AICTE Portal →</a>
      </div>

      <p class="signoff">— Team TimeBank</p>
    </div>
  </div>
</body>
</html>
`;

  return dispatchEmail({ to, subject, text: textContent, html: htmlContent });
}
