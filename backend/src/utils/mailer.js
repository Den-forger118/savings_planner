const nodemailer = require('nodemailer');

const GMAIL_USER = (process.env.GMAIL_USER || process.env.EMAIL_USER || '').trim();
const GMAIL_PASS = (
  process.env.GMAIL_APP_PASSWORD ||
  process.env.EMAIL_PASSWORD ||
  process.env.EMAIL_PASS ||
  ''
).trim();
const MAIL_FROM = (process.env.MAIL_FROM || GMAIL_USER || 'QUANT <noreply@quant>').trim();
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');

let transporter = null;

function isMailConfigured() {
  return Boolean(GMAIL_USER && GMAIL_PASS);
}

function getTransporter() {
  if (!isMailConfigured()) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });
  }
  return transporter;
}

function wrapHtml({ heading, body, buttonLabel, buttonHref }) {
  const button = buttonHref
    ? `<p style="margin:28px 0 8px;">
        <a href="${buttonHref}" style="display:inline-block;background:#D4B16D;color:#0A0F1A;text-decoration:none;font-family:Georgia,serif;font-size:14px;padding:12px 22px;border-radius:6px;">
          ${buttonLabel || 'Continue'}
        </a>
      </p>`
    : '';

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F4EFE6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EFE6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0A0F1A;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 8px;font-family:Georgia,serif;letter-spacing:0.18em;color:#D4B16D;font-size:18px;">
                QUANT
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;font-family:Georgia,serif;color:#FDFBF7;font-size:26px;font-weight:300;">
                ${heading}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px;font-family:Helvetica,Arial,sans-serif;color:#C9C2B5;font-size:15px;line-height:1.6;">
                ${body}
                ${button}
                <p style="margin-top:28px;font-size:12px;color:#8B8378;">Private Savings Intelligence</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendMail({ to, subject, heading, body, buttonLabel, buttonHref, text }) {
  const transport = getTransporter();
  if (!transport) {
    console.warn('[mailer] Gmail is not configured. Skipping email:', subject);
    return { skipped: true };
  }

  try {
    await transport.sendMail({
      from: MAIL_FROM.includes('<') ? MAIL_FROM : `QUANT <${MAIL_FROM}>`,
      to,
      subject,
      text,
      html: wrapHtml({ heading, body, buttonLabel, buttonHref }),
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Failed to send email:', err.message);
    return { skipped: false, error: err.message };
  }
}

function sendLoginNotice(user) {
  const when = new Date().toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const resetUrl = `${FRONTEND_URL}/forgot-password`;

  return sendMail({
    to: user.email,
    subject: 'New QUANT sign-in',
    heading: 'A sign-in was recorded',
    text: `Hello ${user.first_name},\n\nSomeone signed in to your QUANT ledger at ${when}.\nIf this was you, no action is needed.\nIf it was not you, reset your password: ${resetUrl}`,
    body: `<p>Hello ${user.first_name},</p>
      <p>Someone signed in to your QUANT ledger at <strong style="color:#FDFBF7;">${when}</strong>.</p>
      <p>If this was you, no action is needed. If it was not, reset your password immediately.</p>`,
    buttonLabel: 'Reset password',
    buttonHref: resetUrl,
  });
}

function sendPasswordResetEmail(user, resetUrl) {
  return sendMail({
    to: user.email,
    subject: 'Reset your QUANT password',
    heading: 'Reset your password',
    text: `Hello ${user.first_name},\n\nUse this link to choose a new password. It expires in one hour.\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    body: `<p>Hello ${user.first_name},</p>
      <p>Use the button below to choose a new password for your QUANT ledger. This link expires in <strong style="color:#FDFBF7;">one hour</strong>.</p>
      <p>If you did not request a reset, you can ignore this email.</p>`,
    buttonLabel: 'Choose a new password',
    buttonHref: resetUrl,
  });
}

module.exports = {
  FRONTEND_URL,
  isMailConfigured,
  sendLoginNotice,
  sendPasswordResetEmail,
};
