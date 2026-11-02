import nodemailer from "nodemailer";
import { env } from "../config/env";

export const isMailConfigured = Boolean(env.smtp.host);

// Without SMTP settings, emails are rendered but not sent (development mode).
const transporter = isMailConfigured
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

export async function sendMail(to: string, subject: string, html: string, text: string) {
  await transporter.sendMail({ from: env.mailFrom, to, subject, html, text });
}

export async function sendPasswordResetEmail(to: string, name: string, link: string) {
  const text = `Hi ${name},\n\nWe received a request to reset your BWS Sports password.\nOpen this link to choose a new password (valid for 1 hour):\n${link}\n\nIf you did not ask for this, you can ignore this email.`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">
      <h2 style="color:#14532d">BWS Sports</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. The link below is valid for 1 hour.</p>
      <p><a href="${link}" style="display:inline-block;background:#14532d;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Reset password</a></p>
      <p style="font-size:13px;color:#6b7280">If you did not ask for this, you can ignore this email.</p>
    </div>`;
  await sendMail(to, "Reset your BWS Sports password", html, text);
  if (!isMailConfigured) {
    console.log(`\n[mail] SMTP not configured. Password reset link for ${to}:\n${link}\n`);
  }
}
