const nodemailer = require("nodemailer");

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const subject = "Reset your BatchWise Pro password";
  const text = [
    `Hello${name ? ` ${name}` : ""},`,
    "",
    "Use the link below to reset your password. It expires soon.",
    "",
    resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  if (!smtpConfigured()) {
    console.log("\n[BatchWise Pro] Password reset (no SMTP configured — link for local use):");
    console.log(`  To: ${to}`);
    console.log(`  ${resetUrl}\n`);
    return;
  }

  const from =
    process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@localhost";
  await createTransport().sendMail({ from, to, subject, text });
}

module.exports = { sendPasswordResetEmail };
