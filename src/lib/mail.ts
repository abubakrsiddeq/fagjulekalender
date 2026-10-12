import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const smtp = env.smtp;
  if (!smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
      pool: true,
      maxConnections: 2,
    });
  }
  return transporter;
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends an e-mail. With MAIL_LOG_ONLY=true, or without SMTP settings in development,
 * the e-mail is printed to the server console instead of sent.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const t = env.mailLogOnly ? null : getTransporter();
  if (!t) {
    if (env.isProduction && !env.mailLogOnly) throw new Error("SMTP_HOST is not configured.");
    console.log(`\n--- E-mail (SMTP not configured) ---\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n------------------------------------\n`);
    return;
  }
  await t.sendMail({ from: env.smtp.from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
