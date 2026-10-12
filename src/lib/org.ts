import "server-only";
import { db } from "./db";
import { env } from "./env";
import type { Organization } from "./types";

let cached: { at: number; org: Organization } | null = null;
const TTL_MS = 30_000;

export async function getOrg(): Promise<Organization> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.org;
  const org = await db.queryOne<Organization>(
    "SELECT id, name, allowed_email_domains, allow_department_proposals, brand_color, logo_url FROM organizations WHERE id = ?",
    [env.orgId],
  );
  if (!org) throw new Error(`Organization ${env.orgId} not found. Import database/seed.sql or set ORG_ID.`);
  cached = { at: Date.now(), org };
  return org;
}

export function invalidateOrg() {
  cached = null;
}

export function allowedDomains(org: Organization): string[] {
  return (org.allowed_email_domains ?? "")
    .split(/[,\s]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}
