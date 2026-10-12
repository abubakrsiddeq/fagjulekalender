import "server-only";
import crypto from "node:crypto";
import { db, isDuplicateKey } from "./db";
import { env } from "./env";
import { sendMail, escapeHtml } from "./mail";
import { allowedDomains, getOrg } from "./org";
import { createSession, USER_COLUMNS } from "./auth";
import { t } from "@/i18n";
import type { User } from "./types";

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_EMAIL = 5; // per 15 minutes
const MAX_CODES_PER_IP = 30; // per 15 minutes

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

function hashCode(email: string, code: string): string {
  return crypto.createHmac("sha256", env.authSecret).update(`${email}:${code}`).digest("hex");
}

/** Sign-up rule (FR-1.3): admins, existing users, allowed domains and the invite list may sign in. */
export async function isEmailAllowed(email: string): Promise<boolean> {
  const org = await getOrg();
  if (env.adminEmails.includes(email)) return true;
  const existing = await db.queryOne<{ id: number }>("SELECT id FROM users WHERE org_id = ? AND email = ? AND anonymized_at IS NULL", [org.id, email]);
  if (existing) return true;
  const domains = allowedDomains(org);
  const domain = email.split("@")[1] ?? "";
  if (domains.includes(domain)) return true;
  const invited = await db.queryOne<{ x: number }>("SELECT 1 AS x FROM invites WHERE org_id = ? AND email = ?", [org.id, email]);
  if (invited) return true;
  // No domain rule and no invite list: sign-up is open.
  if (domains.length === 0) {
    const anyInvite = await db.queryOne<{ x: number }>("SELECT 1 AS x FROM invites WHERE org_id = ? LIMIT 1", [org.id]);
    if (!anyInvite) return true;
  }
  return false;
}

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function requestLoginCode(email: string, ip: string): Promise<LoginResult> {
  if (!isValidEmail(email)) return { ok: false, error: t.login.invalidEmail };
  if (!(await isEmailAllowed(email))) return { ok: false, error: t.login.notAllowed };

  const since = new Date(Date.now() - 15 * 60_000);
  const perEmail = await db.queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM login_codes WHERE email = ? AND created_at > ?", [email, since]);
  const perIp = await db.queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM login_codes WHERE ip = ? AND created_at > ?", [ip, since]);
  if ((perEmail?.n ?? 0) >= MAX_CODES_PER_EMAIL || (perIp?.n ?? 0) >= MAX_CODES_PER_IP) {
    return { ok: false, error: t.login.tooManyCodes };
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  await db.execute("INSERT INTO login_codes (email, code_hash, ip, expires_at, created_at) VALUES (?, ?, ?, ?, ?)", [
    email,
    hashCode(email, code),
    ip,
    new Date(now.getTime() + CODE_TTL_MIN * 60_000),
    now,
  ]);

  const org = await getOrg();
  await sendMail({
    to: email,
    subject: t.login.emailSubject(code),
    text: t.login.emailText(code, CODE_TTL_MIN, org.name),
    html: `<p>${escapeHtml(t.login.emailIntro(org.name))}</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>${escapeHtml(t.login.emailFooter(CODE_TTL_MIN))}</p>`,
  });
  return { ok: true };
}

export async function verifyLoginCode(email: string, codeRaw: string): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const code = codeRaw.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return { ok: false, error: t.login.wrongCode };

  const row = await db.queryOne<{ id: number; code_hash: string; attempts: number }>(
    "SELECT id, code_hash, attempts FROM login_codes WHERE email = ? AND used_at IS NULL AND expires_at > ? ORDER BY id DESC LIMIT 1",
    [email, new Date()],
  );
  if (!row) return { ok: false, error: t.login.codeExpired };

  // Count the attempt first, so parallel guesses can't exceed the limit.
  const bumped = await db.execute("UPDATE login_codes SET attempts = attempts + 1 WHERE id = ? AND attempts < ?", [row.id, MAX_ATTEMPTS]);
  if (bumped.affectedRows === 0) return { ok: false, error: t.login.tooManyAttempts };

  const expected = Buffer.from(row.code_hash, "hex");
  const actual = Buffer.from(hashCode(email, code), "hex");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return { ok: false, error: row.attempts + 1 >= MAX_ATTEMPTS ? t.login.tooManyAttempts : t.login.wrongCode };
  }

  const used = await db.execute("UPDATE login_codes SET used_at = ? WHERE id = ? AND used_at IS NULL", [new Date(), row.id]);
  if (used.affectedRows === 0) return { ok: false, error: t.login.codeExpired };

  const user = await findOrCreateUser(email);
  await createSession(user.id);
  return { ok: true, user };
}

function guessDisplayName(email: string): string {
  const local = email.split("@")[0].replace(/\d+$/, "");
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toLocaleUpperCase("nb") + p.slice(1))
    .join(" ");
  return (name || "Kollega").slice(0, 100);
}

async function findOrCreateUser(email: string): Promise<User> {
  const org = await getOrg();
  const isAdmin = env.adminEmails.includes(email);
  const select = `SELECT ${USER_COLUMNS.join(", ")} FROM users WHERE org_id = ? AND email = ?`;
  let user = await db.queryOne<User>(select, [org.id, email]);
  if (!user) {
    try {
      await db.execute("INSERT INTO users (org_id, email, display_name, role, created_at) VALUES (?, ?, ?, ?, ?)", [
        org.id,
        email,
        guessDisplayName(email),
        isAdmin ? "admin" : "participant",
        new Date(),
      ]);
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
    }
    user = (await db.queryOne<User>(select, [org.id, email]))!;
  } else if (isAdmin && user.role !== "admin") {
    await db.execute("UPDATE users SET role = 'admin' WHERE id = ?", [user.id]);
    user.role = "admin";
  }
  await db.execute("UPDATE users SET last_login_at = ? WHERE id = ?", [new Date(), user.id]);
  return user;
}
