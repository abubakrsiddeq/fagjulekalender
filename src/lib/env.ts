import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return v;
}

function list(v: string | undefined): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const env = {
  get db() {
    return {
      host: required("DB_HOST"),
      port: Number(process.env.DB_PORT ?? 3306),
      user: required("DB_USER"),
      password: process.env.DB_PASSWORD ?? "",
      database: required("DB_NAME"),
      poolSize: Number(process.env.DB_POOL_SIZE ?? 10),
      ssl: process.env.DB_SSL === "true",
    };
  },
  /** Public base URL, used in e-mails. No trailing slash. */
  get appUrl() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  },
  /** Secret used to hash one-time codes. Long random string. */
  get authSecret() {
    const s = required("AUTH_SECRET");
    if (s.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
    return s;
  },
  /** One organization per deployment in v1. */
  get orgId() {
    return Number(process.env.ORG_ID ?? 1);
  },
  /** These e-mails always get the admin role when they sign in. */
  get adminEmails() {
    return list(process.env.ADMIN_EMAILS);
  },
  get smtp() {
    return {
      host: process.env.SMTP_HOST ?? "",
      port: Number(process.env.SMTP_PORT ?? 465),
      user: process.env.SMTP_USER ?? "",
      password: process.env.SMTP_PASSWORD ?? "",
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "",
    };
  },
  /** Print e-mails to the console instead of sending them (local testing only). */
  get mailLogOnly() {
    return process.env.MAIL_LOG_ONLY === "true";
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
