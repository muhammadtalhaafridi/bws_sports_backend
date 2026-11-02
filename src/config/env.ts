import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 5050),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  dashboardUrl: process.env.DASHBOARD_URL ?? "http://localhost:5174",
  smtp: {
    // Accept the common SMTP_EMAIL/SMTP_PASSWORD names as well as the
    // SMTP_USER/SMTP_PASS names used by the original backend template.
    // Gmail can be inferred when the host is omitted; other providers must
    // set SMTP_HOST explicitly.
    host:
      process.env.SMTP_HOST ||
      ((process.env.SMTP_EMAIL ?? process.env.SMTP_USER ?? "").toLowerCase().endsWith("@gmail.com")
        ? "smtp.gmail.com"
        : ""),
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? process.env.SMTP_EMAIL ?? "",
    pass: process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD ?? "",
  },
  mailFrom: process.env.MAIL_FROM ?? "BWS Sports <no-reply@bwssports.com>",
};
