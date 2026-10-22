const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const GMAIL_USER = (process.env.GMAIL_USER || process.env.EMAIL_USER || '').trim();
const GMAIL_PASS = (
  process.env.GMAIL_APP_PASSWORD ||
  process.env.EMAIL_PASSWORD ||
  process.env.EMAIL_PASS ||
  ''
).trim();
const MAIL_FROM = (
  process.env.MAIL_FROM ||
  (RESEND_API_KEY ? 'QUANT <onboarding@resend.dev>' : GMAIL_USER) ||
  'QUANT <noreply@quant.app>'
).trim();
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');

let transporter = null;
let resendClient = null;

function isResendConfigured() {
  return Boolean(RESEND_API_KEY);
}

function isGmailConfigured() {
  return Boolean(GMAIL_USER && GMAIL_PASS);
}

function isMailConfigured() {
  return isResendConfigured() || isGmailConfigured();
}

function getResend() {
  if (!isResendConfigured()) return null;
  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

function getTransporter() {
  if (!isGmailConfigured()) return null;
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

function formatFrom() {
  return MAIL_FROM.includes('<') ? MAIL_FROM : `QUANT <${MAIL_FROM}>`;
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

async function sendViaResend({ to, subject, heading, body, buttonLabel, buttonHref, text }) {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: formatFrom(),
    to: [to],
    subject,
    text,
    html: wrapHtml({ heading, body, buttonLabel, buttonHref }),
  });

  if (error) {
    throw new Error(error.message || 'Resend send failed');
  }
  return { sent: true, id: data?.id, provider: 'resend' };
}

async function sendViaGmail({ to, subject, heading, body, buttonLabel, buttonHref, text }) {
  const transport = getTransporter();
  await transport.sendMail({
    from: formatFrom(),
    to,
    subject,
    text,
    html: wrapHtml({ heading, body, buttonLabel, buttonHref }),
  });
  return { sent: true, provider: 'gmail' };
}

async function sendMail({ to, subject, heading, body, buttonLabel, buttonHref, text }) {
  if (!isMailConfigured()) {
    console.warn('[mailer] No email provider configured (set RESEND_API_KEY). Skipping:', subject);
    return { skipped: true };
  }

  try {
    // Prefer Resend when configured
    if (isResendConfigured()) {
      return await sendViaResend({ to, subject, heading, body, buttonLabel, buttonHref, text });
    }
    return await sendViaGmail({ to, subject, heading, body, buttonLabel, buttonHref, text });
  } catch (err) {
    console.error('[mailer] Failed to send email:', err.message);
    return { skipped: false, error: err.message };
  }
}

function sendWelcomeEmail(user) {
  const name = user.first_name || 'there';
  return sendMail({
    to: user.email,
    subject: 'Welcome to QUANT',
    heading: 'Welcome to QUANT',
    text: `Hello ${name},\n\nYour QUANT ledger is ready. Set a goal, track deposits, and keep your plan on pace.\n\nOpen QUANT: ${FRONTEND_URL}\n\nIf you did not create this account, you can ignore this email.`,
    body: `<p>Hello ${escapeHtml(name)},</p>
      <p>Your QUANT ledger is ready. Create a goal, log what you save, and use reminders to stay accountable.</p>
      <p>When you are ready, open the app and start with one clear objective.</p>`,
    buttonLabel: 'Open QUANT',
    buttonHref: FRONTEND_URL,
  });
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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sendReminderDigest(user, lines) {
  const settingsUrl = `${FRONTEND_URL}/settings?tab=reminders`;
  const safeLines = (Array.isArray(lines) ? lines : []).filter(Boolean);
  if (safeLines.length === 0) {
    return Promise.resolve({ skipped: true });
  }

  const textList = safeLines.map((line) => `• ${line}`).join('\n');
  const htmlList = safeLines
    .map((line) => `<li style="margin:0 0 10px;">${escapeHtml(line)}</li>`)
    .join('');

  return sendMail({
    to: user.email,
    subject: 'Your QUANT reminders',
    heading: 'Ledger reminders',
    text: `Hello ${user.first_name},\n\n${textList}\n\nOpen QUANT: ${FRONTEND_URL}\nManage reminders: ${settingsUrl}`,
    body: `<p>Hello ${escapeHtml(user.first_name)},</p>
      <ul style="padding-left:18px;margin:12px 0;color:#C9C2B5;">${htmlList}</ul>
      <p style="font-size:12px;color:#8B8378;">You can change or turn off reminders in Settings.</p>`,
    buttonLabel: 'Open QUANT',
    buttonHref: FRONTEND_URL,
  });
}

function sendGoalCompleteCelebration(user, goalName) {
  const name = String(goalName || 'Your goal').trim() || 'Your goal';
  return sendMail({
    to: user.email,
    subject: `${name} is fully funded!`,
    heading: 'Goal complete',
    text: `Hello ${user.first_name},\n\n${name} is fully funded. Well done.\n\nOpen QUANT: ${FRONTEND_URL}`,
    body: `<p>Hello ${escapeHtml(user.first_name)},</p>
      <p><strong style="color:#FDFBF7;">${escapeHtml(name)}</strong> is fully funded. Your remaining goals can recalibrate around what is left.</p>`,
    buttonLabel: 'Open QUANT',
    buttonHref: FRONTEND_URL,
  });
}

function sendWalletCreditNotice(user, amount, currency, allocations = []) {
  const cur = String(currency || 'GHS').toUpperCase();
  const amt = Number.parseFloat(amount).toFixed(2);
  const safeAllocations = Array.isArray(allocations) ? allocations.filter((row) => row?.amount > 0) : [];

  if (safeAllocations.length > 0) {
    const summary = safeAllocations
      .map((row) => `• ${row.goalName}: ${cur} ${Number(row.amount).toFixed(2)}`)
      .join('\n');
    const htmlList = safeAllocations
      .map(
        (row) =>
          `<li><strong style="color:#FDFBF7;">${escapeHtml(row.goalName)}</strong> — ${escapeHtml(cur)} ${escapeHtml(Number(row.amount).toFixed(2))}</li>`
      )
      .join('');
    return sendMail({
      to: user.email,
      subject: `${cur} ${amt} received and applied to your goals`,
      heading: 'Deposit applied',
      text: `Hello ${user.first_name},\n\n${cur} ${amt} arrived in your QUANT transfer account and was automatically allocated:\n${summary}\n\n${FRONTEND_URL}`,
      body: `<p>Hello ${escapeHtml(user.first_name)},</p>
        <p><strong style="color:#FDFBF7;">${escapeHtml(cur)} ${escapeHtml(amt)}</strong> arrived in your QUANT transfer account and was automatically allocated to your goals (highest priority first):</p>
        <ul>${htmlList}</ul>`,
      buttonLabel: 'Open QUANT',
      buttonHref: FRONTEND_URL,
    });
  }

  return sendMail({
    to: user.email,
    subject: `${cur} ${amt} is in your QUANT wallet`,
    heading: 'Wallet funded',
    text: `Hello ${user.first_name},\n\n${cur} ${amt} arrived in your QUANT wallet via your transfer account. Open QUANT and allocate it to a savings goal.\n\n${FRONTEND_URL}`,
    body: `<p>Hello ${escapeHtml(user.first_name)},</p>
      <p><strong style="color:#FDFBF7;">${escapeHtml(cur)} ${escapeHtml(amt)}</strong> arrived in your QUANT wallet via your transfer account.</p>
      <p>Allocate it to a savings goal when you are ready — no extra Paystack fee on allocation. QUANT does not sync your personal MoMo or bank balance.</p>`,
    buttonLabel: 'Allocate in QUANT',
    buttonHref: FRONTEND_URL,
  });
}

module.exports = {
  FRONTEND_URL,
  isMailConfigured,
  sendWelcomeEmail,
  sendLoginNotice,
  sendPasswordResetEmail,
  sendReminderDigest,
  sendGoalCompleteCelebration,
  sendWalletCreditNotice,
};
