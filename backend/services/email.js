const nodemailer = require('nodemailer');
require('dotenv').config();

// Initialize Brevo SMTP Transporter with optimized timeout and connection pooling
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // TLS / STARTTLS
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify SMTP connection on startup if configured
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter.verify((error) => {
    if (error) {
      console.warn('[EMAIL WARNING] Brevo SMTP connection failed:', error.message);
    } else {
      console.log('📧 Brevo SMTP Relay ready to dispatch institutional emails.');
    }
  });
}

/**
 * Core Email Dispatcher Function
 */
async function sendEmail({ to, subject, html, text }) {
  if (!to || (!process.env.SMTP_USER && !process.env.SMTP_PASS)) {
    console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    const rawFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || '3ithackathon@gmail.com';
    const fromAddress = String(rawFrom).trim().replace(/^["']|["']$/g, '');
    const cleanTo = String(to).trim();

    const info = await transporter.sendMail({
      from: {
        name: 'FINDORA AI Vault',
        address: fromAddress
      },
      replyTo: process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim() : fromAddress,
      to: cleanTo,
      subject,
      text: text || (html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
      html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    });
    console.log(`📧 [BREVO SMTP DISPATCH SUCCESS] MessageId: ${info.messageId} -> Queued for ${cleanTo}`);
    return { success: true, messageId: info.messageId, response: info.response };
  } catch (error) {
    console.error('❌ [BREVO SMTP ERROR] Failed sending to', to, ':', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Shared Institutional Base Layout for all FINDORA AI Emails
 */
function renderBaseTemplate({
  title,
  badge,
  badgeColor = '#2563eb',
  contentHtml,
  ctaText = 'Open Findora Portal',
  ctaUrl = 'https://findoravsbec.vercel.app'
}) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 24px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="padding: 26px 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); text-align: left;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="display: inline-block; font-size: 21px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                    🛡️ FINDORA <span style="color: #38bdf8;">AI</span>
                  </span>
                  <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600;">
                    Autonomous Campus Lost &amp; Found Intelligence Network
                  </div>
                </td>
                <td align="right" valign="top">
                  <span style="display: inline-block; padding: 5px 12px; border-radius: 9999px; background: ${badgeColor}22; border: 1px solid ${badgeColor}; color: ${badgeColor}; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${badge}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Main Body Content -->
        <tr>
          <td style="padding: 32px 32px 24px 32px; color: #1e293b;">
            ${contentHtml}

            <!-- CTA Button -->
            ${ctaText && ctaUrl ? `
              <div style="margin: 32px 0 12px 0; text-align: center;">
                <a href="${ctaUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);">
                  ${ctaText} &rarr;
                </a>
              </div>
            ` : ''}
          </td>
        </tr>

        <!-- Security Protocol Banner -->
        <tr>
          <td style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
            🔒 <strong>Zero-Knowledge Ownership Protocol:</strong> Keep secret handover codes and private attribute details confidential. Official asset recovery must be authorized by designated Campus Verification Officers.
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 24px 32px; background: #0f172a; color: #94a3b8; font-size: 11px; line-height: 1.6; text-align: center;">
            <p style="margin: 0 0 6px 0; font-weight: 700; color: #cbd5e1; font-size: 12px;">
              FINDORA AI • V.S.B. Engineering College (VSBEC) • Team 22 (Techsquad)
            </p>
            <p style="margin: 0 0 10px 0;">
              Telegram Channel: <a href="https://t.me/findoravsb_bot" style="color: #38bdf8; text-decoration: none; font-weight: bold;">@findoravsb_bot</a> • Web Portal: <a href="https://findoravsbec.vercel.app" style="color: #38bdf8; text-decoration: none;">findoravsbec.vercel.app</a>
            </p>
            <p style="margin: 0; color: #64748b; font-size: 10px;">
              This is an automated institutional notification from the FINDORA Campus Intelligence Gateway.
            </p>
          </td>
        </tr>

      </table>
    </body>
    </html>
  `;
}

/**
 * 1. SIGNUP: Welcome & Account Registration Email
 */
async function sendWelcomeRegistrationEmail(toEmail, userName = 'Student', userRole = 'student') {
  const roleTitle = userRole === 'admin' 
    ? 'Campus Administrator' 
    : userRole === 'verification_officer' 
      ? 'Verification & Custody Officer' 
      : 'Campus Student / Member';

  const roleColor = userRole === 'admin' ? '#dc2626' : userRole === 'verification_officer' ? '#d97706' : '#2563eb';

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #0f172a;">
      Welcome to Findora Vault, ${userName}! 👋
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      Your account on the <strong>FINDORA AI Autonomous Campus Lost &amp; Found Network</strong> has been successfully initialized and authenticated.
    </p>

    <!-- Account Details Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom: 10px; color: #64748b; font-size: 12px; font-weight: 600;">Full Name:</td>
          <td style="padding-bottom: 10px; color: #0f172a; font-weight: 700; font-size: 14px;" align="right">${userName}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 10px; color: #64748b; font-size: 12px; font-weight: 600;">Registered Email:</td>
          <td style="padding-bottom: 10px; color: #0f172a; font-weight: 700; font-size: 14px;" align="right">${toEmail}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 12px; font-weight: 600;">Campus Role:</td>
          <td style="color: ${roleColor}; font-weight: 800; font-size: 13px;" align="right">
            <span style="background: ${roleColor}18; padding: 4px 10px; border-radius: 6px; border: 1px solid ${roleColor}44;">
              ${roleTitle}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      <div style="font-size: 13px; color: #1e40af; font-weight: 600;">✨ Platform Capabilities:</div>
      <ul style="margin: 6px 0 0 0; padding-left: 18px; font-size: 12px; color: #334155; line-height: 1.6;">
        <li>Log lost or found items with <strong>live WebRTC optical GPS watermarking</strong></li>
        <li>Receive instant <strong>multimodal matching alerts (94.2% precision)</strong></li>
        <li>Recover items securely via <strong>Zero-Knowledge Blind Verification</strong></li>
      </ul>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `🛡️ Welcome to Findora Vault, ${userName}!`,
    text: `Hello ${userName}!\n\nWelcome to Findora Vault. Your account is active as ${roleTitle}.\nEmail: ${toEmail}\n\nAccess the campus portal: https://findoravsbec.vercel.app`,
    html: renderBaseTemplate({
      title: 'Welcome to Findora Vault',
      badge: 'Account Active',
      badgeColor: '#16a34a',
      contentHtml,
      ctaText: 'Enter Campus Portal'
    })
  });
}

/**
 * 2. OTP: 6-Digit Password Reset Verification Code Email
 */
async function sendPasswordResetEmail(toEmail, resetCode) {
  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #0f172a;">
      🔐 Password Reset Verification Code
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      A password reset was requested for your Findora campus account (<strong>${toEmail}</strong>). Enter this 6-digit one-time verification code to proceed:
    </p>

    <!-- OTP Code Box -->
    <div style="background: #f8fafc; border: 2px dashed #0284c7; border-radius: 14px; padding: 26px; text-align: center; margin: 24px 0;">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #0369a1; letter-spacing: 1px; margin-bottom: 8px;">
        One-Time Verification OTP
      </div>
      <span style="font-size: 44px; font-weight: 900; letter-spacing: 12px; color: #0284c7; font-family: 'SF Mono', Consolas, Monaco, monospace; display: inline-block;">
        ${resetCode}
      </span>
      <div style="color: #64748b; font-size: 12px; margin-top: 12px; font-weight: 600;">
        ⏱️ Valid for 15 minutes. Never disclose this OTP to anyone.
      </div>
    </div>

    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
      If you did not request this password reset, please ignore this email. Your password remains unchanged and secure.
    </p>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[FINDORA AI] Your Password Reset OTP Code: ${resetCode}`,
    text: `Your Findora Vault verification code is: ${resetCode}\n\nValid for 15 minutes. Enter this code to reset your account password.`,
    html: renderBaseTemplate({
      title: 'Password Verification Code',
      badge: 'Security OTP',
      badgeColor: '#0284c7',
      contentHtml,
      ctaText: 'Enter Code & Reset Password',
      ctaUrl: 'https://findoravsbec.vercel.app'
    })
  });
}

/**
 * 3. PASSWORD CHANGED: Password Successfully Updated Confirmation Email
 */
async function sendPasswordChangedSuccessEmail(toEmail, userName = 'Student') {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #15803d;">
      ✅ Password Reset Successfully
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      Hello <strong>${userName}</strong>, this is a security confirmation that your Findora campus account password was changed successfully.
    </p>

    <!-- Details Card -->
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom: 8px; color: #166534; font-size: 12px; font-weight: 600;">Account:</td>
          <td style="padding-bottom: 8px; color: #14532d; font-weight: 700; font-size: 13px;" align="right">${toEmail}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px; color: #166534; font-size: 12px; font-weight: 600;">Updated At:</td>
          <td style="padding-bottom: 8px; color: #14532d; font-weight: 700; font-size: 13px;" align="right">${timestamp} (IST)</td>
        </tr>
        <tr>
          <td style="color: #166534; font-size: 12px; font-weight: 600;">Status:</td>
          <td style="color: #15803d; font-weight: 800; font-size: 13px;" align="right">ACTIVE &amp; SECURED</td>
        </tr>
      </table>
    </div>

    <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      <div style="font-size: 12px; color: #92400e; line-height: 1.5;">
        ⚠️ <strong>Security Notice:</strong> If you did not perform this action, please alert campus safety administrators immediately to freeze your account.
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `🛡️ [FINDORA AI] Password Reset Successful`,
    text: `Your Findora account password was updated successfully on ${timestamp}.\n\nIf you did not make this change, please contact campus security immediately.`,
    html: renderBaseTemplate({
      title: 'Password Changed Successfully',
      badge: 'Security Updated',
      badgeColor: '#16a34a',
      contentHtml,
      ctaText: 'Sign In to Your Account'
    })
  });
}

/**
 * 4. LOST REPORT: Lost Item Registered Confirmation Email (with 1-Time Secret Code)
 */
async function sendReportConfirmationEmail(toEmail, item = {}, closeCode = '------') {
  const title = item.title || 'Registered Lost Item';
  const category = item.category || 'General';
  const location = item.building ? `${item.building} (Floor ${item.floor || 1})` : (item.location || 'Campus Facilities');
  const itemId = item.id || `item_${Date.now()}`;

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #0f172a;">
      📋 Lost Property Report Registered
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      Your report for <strong>${title}</strong> has been indexed in the Findora Campus Network. Our multimodal AI is scanning active found inventory 24/7.
    </p>

    <!-- Close Code Box -->
    <div style="background: #eff6ff; border: 2px dashed #2563eb; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0;">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #1e40af; letter-spacing: 0.8px;">
        Your Secret 1-Time Handover Code
      </div>
      <div style="font-size: 38px; font-weight: 900; letter-spacing: 6px; color: #1d4ed8; font-family: 'SF Mono', Consolas, Monaco, monospace; margin: 10px 0;">
        ${closeCode}
      </div>
      <div style="font-size: 12px; color: #1e40af; font-weight: 600;">
        Recite this code to the verification officer when picking up your item to close the search.
      </div>
    </div>

    <!-- Details Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom: 8px; color: #64748b; font-size: 12px;">Item:</td>
          <td style="padding-bottom: 8px; color: #0f172a; font-weight: 700; font-size: 13px;" align="right">${title} (${category})</td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px; color: #64748b; font-size: 12px;">Last Seen Zone:</td>
          <td style="padding-bottom: 8px; color: #0f172a; font-weight: 700; font-size: 13px;" align="right">${location}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 12px;">Case Reference:</td>
          <td style="color: #64748b; font-family: monospace; font-size: 12px;" align="right">${itemId}</td>
        </tr>
      </table>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[FINDORA AI] Lost Report Registered - Secret Handover Code: ${closeCode}`,
    text: `Your report for ${title} has been registered.\n1-Time Handover Code: ${closeCode}\nZone: ${location}\nReference: ${itemId}\n\nWhen receiving your item, recite this code to the Verification Officer to close the search.`,
    html: renderBaseTemplate({
      title: 'Lost Property Report Confirmed',
      badge: 'Report Open',
      badgeColor: '#2563eb',
      contentHtml,
      ctaText: 'Track Search Progress'
    })
  });
}

/**
 * 5. FOUND REPORT: Found Item Registered Confirmation Email
 */
async function sendFoundReportConfirmationEmail(toEmail, item = {}) {
  const title = item.title || 'Found Property';
  const category = item.category || 'General';
  const location = item.building ? `${item.building} (Floor ${item.floor || 1})` : (item.location || 'Campus Grounds');
  const itemId = item.id || `item_${Date.now()}`;

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #15803d;">
      🙌 Thank You for Logging Found Property!
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      Your submission of <strong>${title}</strong> has been stamped with optical GPS evidence and added to the campus lost-and-found catalog.
    </p>

    <!-- Details Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom: 8px; color: #64748b; font-size: 12px;">Found Item:</td>
          <td style="padding-bottom: 8px; color: #0f172a; font-weight: 700; font-size: 13px;" align="right">${title} (${category})</td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px; color: #64748b; font-size: 12px;">Discovered Location:</td>
          <td style="padding-bottom: 8px; color: #0f172a; font-weight: 700; font-size: 13px;" align="right">${location}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 12px;">Inventory ID:</td>
          <td style="color: #64748b; font-family: monospace; font-size: 12px;" align="right">${itemId}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
      Please deposit the physical item with the nearest <strong>Department Office</strong> or <strong>Central Security Desk</strong> so the rightful owner can complete verification.
    </p>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[FINDORA AI] Found Property Logged: ${title}`,
    text: `Thank you for reporting ${title} found at ${location}. Reference ID: ${itemId}`,
    html: renderBaseTemplate({
      title: 'Found Property Logged',
      badge: 'Turned In',
      badgeColor: '#16a34a',
      contentHtml,
      ctaText: 'View Campus Catalog'
    })
  });
}

/**
 * 6. MATCH ALERT: High-Confidence AI Match Discovered Notification
 */
async function sendMatchAlertEmail(toEmail, matchData = {}) {
  const lostTitle = matchData.lost_title || 'Your Reported Lost Item';
  const foundTitle = matchData.found_title || 'Campus Discovered Item';
  const confidence = Math.round((matchData.final_score || 0.9) * 100);

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #0f172a;">
      ✨ High-Confidence AI Match Detected!
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      Our multimodal AI vision engine correlated your lost item report with newly indexed property registered on campus.
    </p>

    <!-- Comparison Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom: 12px; border-bottom: 1px dashed #cbd5e1;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #dc2626;">Your Lost Report</div>
            <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${lostTitle}</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px dashed #cbd5e1;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #16a34a;">Matched Found Item</div>
            <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${foundTitle}</div>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 12px;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size: 13px; font-weight: 600; color: #475569;">Multimodal Correlation:</span>
                </td>
                <td align="right">
                  <span style="font-size: 18px; font-weight: 900; color: #2563eb;">${confidence}% Match</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
      <strong>Next Step:</strong> Click below to start your <strong>Zero-Knowledge Ownership Challenge</strong>. You will answer 3 targeted questions derived from hidden physical traits to verify ownership.
    </p>
  `;

  return sendEmail({
    to: toEmail,
    subject: `✨ [FINDORA AI] High Confidence Match Detected (${confidence}%): ${lostTitle}`,
    text: `High-Confidence AI Match Found!\nYour Lost Report: ${lostTitle}\nMatched Found Item: ${foundTitle}\nConfidence: ${confidence}%\n\nPlease visit https://findoravsbec.vercel.app to start your ownership challenge.`,
    html: renderBaseTemplate({
      title: 'High Confidence Match Detected',
      badge: `${confidence}% Match`,
      badgeColor: '#2563eb',
      contentHtml,
      ctaText: 'Review Match & Claim'
    })
  });
}

/**
 * 7. VERIFIED / HANDOVER CODE: Claim Approved & Custody Authorized Email
 */
async function sendHandoverCodeEmail(toEmail, recoveryCase = {}) {
  const code = recoveryCase.handover_code || '------';
  const pickup = recoveryCase.pickup_location || 'Campus Central Security Desk, Academic Admin Hall';
  const caseId = recoveryCase.id || `rec_${Date.now()}`;

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #15803d;">
      ✅ Claim Approved &amp; Custody Authorized!
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      Your blind challenge answers have been verified by institutional security protocols. Your item is cleared for custody collection.
    </p>

    <!-- Code Card -->
    <div style="background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0;">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #166534; letter-spacing: 1px;">
        1-Time Secure Handover Verification Code
      </div>
      <div style="font-size: 40px; font-weight: 900; letter-spacing: 6px; color: #15803d; font-family: 'SF Mono', Consolas, Monaco, monospace; margin: 10px 0;">
        ${code}
      </div>
      <div style="font-size: 12px; color: #166534; font-weight: 600;">
        Present this code to the Security Officer at the pickup desk to complete collection.
      </div>
    </div>

    <!-- Location Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px;">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Authorized Pickup Point</div>
      <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 3px;">📍 ${pickup}</div>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Case ID: <code>${caseId}</code></div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[FINDORA AI] Claim Approved: Handover Code ${code}`,
    text: `Your claim has been approved!\nHandover Code: ${code}\nPickup Station: ${pickup}\nCase ID: ${caseId}\n\nPresent this code to the officer to complete collection.`,
    html: renderBaseTemplate({
      title: 'Claim Approved & Custody Authorized',
      badge: 'Authorized',
      badgeColor: '#16a34a',
      contentHtml,
      ctaText: 'View Case Status'
    })
  });
}

/**
 * 8. RECOVERED & CLOSED: Custody Closed Notification Email
 */
async function sendSearchClosedEmail(toEmail, item = {}, officerName = 'Campus Security Officer') {
  const title = item.title || 'Recovered Item';
  const category = item.category || 'General';

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #15803d;">
      🎉 Search Successfully Closed &amp; Item Recovered!
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      Your item <strong>${title}</strong> has been returned to you and the custody ledger has been securely sealed.
    </p>

    <!-- Summary Box -->
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom: 8px; color: #166534; font-size: 12px; font-weight: 600;">Recovered Item:</td>
          <td style="padding-bottom: 8px; color: #14532d; font-weight: 700; font-size: 13px;" align="right">${title} (${category})</td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px; color: #166534; font-size: 12px; font-weight: 600;">Verified By:</td>
          <td style="padding-bottom: 8px; color: #14532d; font-weight: 700; font-size: 13px;" align="right">${officerName}</td>
        </tr>
        <tr>
          <td style="color: #166534; font-size: 12px; font-weight: 600;">Ledger Status:</td>
          <td style="color: #15803d; font-weight: 900; font-size: 13px;" align="right">RECOVERED &amp; CLOSED</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
      Thank you for using FINDORA AI. We are proud to keep our campus community connected and secure.
    </p>
  `;

  return sendEmail({
    to: toEmail,
    subject: `🎉 [FINDORA AI] Search Closed: ${title} Recovered!`,
    text: `Your item ${title} has been verified and returned by ${officerName}. The search has officially been closed.`,
    html: renderBaseTemplate({
      title: 'Search Successfully Closed',
      badge: 'Recovered',
      badgeColor: '#16a34a',
      contentHtml,
      ctaText: 'View Custody Ledger'
    })
  });
}

module.exports = {
  sendEmail,
  sendMatchAlertEmail,
  sendHandoverCodeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedSuccessEmail,
  sendWelcomeRegistrationEmail,
  sendReportConfirmationEmail,
  sendFoundReportConfirmationEmail,
  sendSearchClosedEmail
};
