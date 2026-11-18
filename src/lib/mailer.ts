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
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    })
  : nodemailer.createTransport({ jsonTransport: true });

/** Checks the SMTP login once at startup so a wrong password shows up in the console straight away. */
export async function verifyMailer() {
  if (!isMailConfigured) {
    console.log("[mail] SMTP not configured. Reset codes will be printed in this console.");
    return;
  }
  try {
    await transporter.verify();
    console.log(`[mail] SMTP ready (${env.smtp.host} as ${env.smtp.user})`);
  } catch (error) {
    console.error(`[mail] SMTP login failed for ${env.smtp.user}: ${(error as Error).message}`);
  }
}

export async function sendMail(to: string, subject: string, html: string, text: string) {
  await transporter.sendMail({ from: env.mailFrom, to, subject, html, text });
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  code: string,
  link: string,
  validMinutes: number,
) {
  const safeName = escapeHtml(name);
  const text = [
    `Hi ${name},`,
    "",
    "We received a request to reset your BWS Sports password.",
    "",
    `Your verification code is: ${code}`,
    "",
    `Enter this code on the reset password page, or open this link: ${link}`,
    "",
    `The code expires in ${validMinutes} minutes and can only be used once.`,
    "If you did not ask for this, you can ignore this email. Your password will not change.",
    "",
    "BWS Sports",
  ].join("\n");

  const html = `
  <div style="background:#f3f4f6;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
    <div style="max-width:480px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden">
      <div style="background:#14532d;padding:20px 28px">
        <h1 style="margin:0;color:#ffffff;font-size:22px">BWS Sports</h1>
      </div>
      <div style="padding:28px">
        <p style="margin:0 0 12px">Hi ${safeName},</p>
        <p style="margin:0 0 20px">We received a request to reset your password. Use this verification code:</p>
        <div style="text-align:center;margin:0 0 20px">
          <span style="display:inline-block;font-size:34px;font-weight:bold;letter-spacing:10px;color:#14532d;background:#f0fdf4;border:2px dashed #16a34a;border-radius:10px;padding:14px 22px">${code}</span>
        </div>
        <p style="margin:0 0 20px;text-align:center;color:#6b7280;font-size:14px">This code expires in ${validMinutes} minutes and can only be used once.</p>
        <p style="text-align:center;margin:0 0 24px">
          <a href="${link}" style="display:inline-block;background:#14532d;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Reset password</a>
        </p>
        <p style="margin:0;font-size:13px;color:#6b7280">If you did not ask for this, you can ignore this email. Your password will not change.</p>
      </div>
    </div>
  </div>`;

  await sendMail(to, `${code} is your BWS Sports verification code`, html, text);
  if (!isMailConfigured) {
    console.log(`\n[mail] SMTP not configured. Password reset code for ${to}: ${code}\n${link}\n`);
  }
}
