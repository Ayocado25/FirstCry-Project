'use strict';

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Lazily initialise transporter so missing SMTP config doesn't crash on startup
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return _transporter;
}

// Lazily initialise Twilio client
let _twilioClient = null;

function getTwilioClient() {
  if (_twilioClient) return _twilioClient;
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }
  const twilio = require('twilio');
  _twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return _twilioClient;
}

// ---------------------------------------------------------------
// EMAIL
// ---------------------------------------------------------------

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.SMTP_USER) {
    logger.warn('SMTP not configured — email send skipped (dev mode)');
    logger.info(`[DEV] Email to: ${to} | Subject: ${subject}`);
    return { messageId: 'dev-skip' };
  }

  const info = await getTransporter().sendMail({
    from: `"FirstCry Intellitots" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  });

  logger.info(`Email sent to ${to}: ${info.messageId}`);
  return info;
}

// ---------------------------------------------------------------
// WHATSAPP (Twilio)
// ---------------------------------------------------------------

async function sendWhatsApp({ to, body }) {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    logger.warn('Twilio not configured — WhatsApp send skipped (dev mode)');
    logger.info(`[DEV] WhatsApp to: ${to} | Body: ${body.substring(0, 100)}...`);
    return { sid: 'dev-skip' };
  }

  // Ensure number has whatsapp: prefix
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  const message = await getTwilioClient().messages.create({ from, to: toFormatted, body });
  logger.info(`WhatsApp sent to ${to}: ${message.sid}`);
  return message;
}

// ---------------------------------------------------------------
// EMAIL TEMPLATES
// ---------------------------------------------------------------

function buildDailySummaryEmailHtml({ parentName, childName, date, summaryText }) {
  const firstName = parentName?.split(' ')[0] || 'Parent';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${childName}'s Daily Summary</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6C63FF 0%, #4ECDC4 100%); padding: 32px 24px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p  { color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 16px; color: #2d3748; margin-bottom: 16px; }
    .summary-box { background: #f8f9ff; border-left: 4px solid #6C63FF; border-radius: 8px; padding: 16px 20px; margin: 20px 0; font-size: 15px; color: #4a5568; line-height: 1.7; }
    .cta { text-align: center; margin: 28px 0 8px; }
    .cta a { background: #6C63FF; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-block; }
    .footer { background: #f7f8fc; padding: 20px 24px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #e2e8f0; }
    .footer a { color: #6C63FF; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🌟 ${childName}'s Daily Update</h1>
      <p>${date}</p>
    </div>
    <div class="body">
      <p class="greeting">Dear ${firstName},</p>
      <p style="color:#4a5568;font-size:15px;line-height:1.6;">
        Here is a summary of ${childName}'s day at <strong>FirstCry Intellitots</strong>:
      </p>
      <div class="summary-box">${summaryText.replace(/\n/g, '<br/>')}</div>
      <p style="color:#718096;font-size:14px;line-height:1.6;">
        We hope your little one had a great day. If you have any questions or feedback,
        please feel free to reach out to your child's teacher.
      </p>
      <p style="color:#718096;font-size:14px;">
        With care,<br/>
        <strong>The Intellitots Team</strong>
      </p>
    </div>
    <div class="footer">
      You are receiving this because you are a registered parent at FirstCry Intellitots.<br/>
      © ${new Date().getFullYear()} FirstCry Intellitots. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}

function buildDailySummaryWhatsAppText({ childName, date, summaryText }) {
  return `*FirstCry Intellitots — Daily Update* 🌟\n\n*${childName}'s Day — ${date}*\n\n${summaryText}\n\n_This is an automated message from your daycare centre._`;
}

module.exports = {
  sendEmail,
  sendWhatsApp,
  buildDailySummaryEmailHtml,
  buildDailySummaryWhatsAppText,
};
