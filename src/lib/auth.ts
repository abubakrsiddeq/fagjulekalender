import "server-only";
import crypto from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "./db";
import { env } from "./env";
import type { Role, User } from "./types";

export const SESSION_COOKIE = "fjk_session";

/** Columns for the `User` type; prefix with "u." when the query joins users as `u`. */
export const USER_COLUMNS = [
  "id",
  "org_id",
  "email",
  "display_name",
  "role",
  "hide_name",
  "notify_daily",
  "kommune",
  "bydel",
  "ressursnummer",
  "ansvarlig",
  "department_id",
  "registered_at",
];
const SESSION_DAYS = 45;

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function createSession(userId: number): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  await db.execute("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)", [sha256(token), userId, expires, now]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.appUrl.startsWith("https://"),
    path: "/",
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.execute("DELETE FROM sessions WHERE id = ?", [sha256(token)]);
  store.delete(SESSION_COOKIE);
}

/**
 * The signed-in user, or null. Cached for the duration of one request.
 * `connection()` marks everything after it as request-time only, so the current
 * time and database reads never run while Next.js prerenders a page shell.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return db.queryOne<User>(
    `SELECT ${USER_COLUMNS.map((c) => `u.${c}`).join(", ")}
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > ? AND u.anonymized_at IS NULL AND u.org_id = ?`,
    [sha256(token), new Date(), env.orgId],
  );
});

/** For pages: redirects to sign-in when nobody is signed in. */
export async function requireUser(returnTo: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/logg-inn?neste=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requireRole(roles: Role[], returnTo: string): Promise<User> {
  const user = await requireUser(returnTo);
  if (!roles.includes(user.role)) redirect("/?ingen-tilgang=1");
  return user;
}

export function requireAdmin(returnTo = "/admin"): Promise<User> {
  return requireRole(["admin"], returnTo);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 45);
  return (h.get("x-real-ip") ?? "unknown").slice(0, 45);
}

/** Only allow same-site relative paths as post-login redirect targets. */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
