import "server-only";
import { headers } from "next/headers";
import { env } from "./env";

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const ERROR_MESSAGES: Record<number, string> = {
  400: "Ugyldig forespørsel.",
  401: "Du må logge inn.",
  403: "Ingen tilgang.",
  404: "Fant ikke det du lette etter.",
  429: "For mange forespørsler. Vent litt og prøv igjen.",
};

export function apiError(status: number, code?: string, message?: string): Response {
  return json({ error: code ?? String(status), message: message ?? ERROR_MESSAGES[status] ?? "Feil." }, status);
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
