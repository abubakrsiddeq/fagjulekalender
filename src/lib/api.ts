import "server-only";
import { headers } from "next/headers";
import { env } from "./env";
import { getT } from "@/i18n/server";

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function apiError(status: number, code?: string, message?: string): Promise<Response> {
  const t = await getT();
  const http = t.http as Record<number, string>;
  return json({ error: code ?? String(status), message: message ?? http[status] ?? t.http.other }, status);
}

/**
 * Rejects cross-site POSTs. Session cookies are SameSite=Lax already; this is a second check.
 * Accepts the request's own host, the proxy's forwarded host and the host in APP_URL.
 */
export async function isSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return true; // same-origin fetches from older browsers, curl in tests
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const allowed = new Set<string>();
  for (const v of [h.get("host"), h.get("x-forwarded-host")]) if (v) allowed.add(v.split(",")[0].trim());
  try {
    allowed.add(new URL(env.appUrl).host);
  } catch {
    // ignore malformed APP_URL
  }
  return allowed.has(originHost);
}
