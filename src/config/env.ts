import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/** Links in emails need a real address, so values like "*" fall back to the default. */
function siteUrl(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return value.replace(/\/+$/, "");
  } catch {
    // handled below
  }
  console.warn(`[env] ${name}="${value}" is not a valid http(s) address. Using ${fallback} instead.`);
  return fallback;
}

const smtpUser = process.env.SMTP_USER ?? process.env.SMTP_EMAIL ?? "";

export const env = {
  port: Number(process.env.PORT ?? 5050),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientUrl: siteUrl("CLIENT_URL", "http://localhost:5173"),
  dashboardUrl: siteUrl("DASHBOARD_URL", "http://localhost:5174"),
  smtp: {
    // Accept the common SMTP_EMAIL/SMTP_PASSWORD names as well as the
    // SMTP_USER/SMTP_PASS names used by the original backend template.
    // Gmail can be inferred when the host is omitted; other providers must
    // set SMTP_HOST explicitly.
    host:
      process.env.SMTP_HOST ||
      (smtpUser.toLowerCase().endsWith("@gmail.com") ? "smtp.gmail.com" : ""),
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: smtpUser,
    // Gmail shows app passwords in groups of four ("abcd efgh ..."); the spaces are not part of it.
    pass: (process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD ?? "").replace(/\s+/g, ""),
  },
  // Gmail rejects or rewrites a From address that differs from the logged-in account.
  mailFrom: process.env.MAIL_FROM || (smtpUser ? `BWS Sports <${smtpUser}>` : "BWS Sports <no-reply@bwssports.com>"),
};
