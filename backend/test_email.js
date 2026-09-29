require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const targets = [
  'tharunkumark42007@gmail.com',
  'sivakumar463703@gmail.com',
  'writetokumarsanthosh@gmail.com'
];

async function sendAll() {
  for (const to of targets) {
    try {
      const res = await transporter.sendMail({
        from: `"FINDORA AI Vault" <${process.env.EMAIL_FROM}>`,
        to,
        subject: '[FINDORA AI] Your Password Reset OTP Code: 839210',
        text: 'Your 6-digit OTP code is: 839210. Valid for 15 minutes.'
      });
      console.log('Sent to', to, '-> Status:', res.response);
    } catch (e) {
      console.error('Failed to', to, ':', e.message);
    }
  }
}
sendAll();
