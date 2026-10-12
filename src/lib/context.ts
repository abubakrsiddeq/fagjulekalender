import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, requireUser } from "./auth";
import { getCalendarBySlug } from "./calendar";
import { ensureMembership } from "./registration";
import type { Calendar, User } from "./types";

/** Calendars participants may see: published and archived. Admins can also open drafts. */
export function canSeeCalendar(cal: Calendar, user: User): boolean {
  return cal.status !== "draft" || user.role === "admin";
}

export async function loadCalendarPage(slug: string, returnTo: string) {
  const user = await requireUser(returnTo);
  if (!user.registered_at) redirect(`/registrering?neste=${encodeURIComponent(returnTo)}`);
  const cal = await getCalendarBySlug(slug);
  if (!cal || !canSeeCalendar(cal, user)) notFound();
  // Participants join each calendar with the department from their registration.
  const membership = await ensureMembership(cal, user);
  return { user, cal, membership };
}

/** Same checks for route handlers; returns an HTTP status instead of redirecting. */
export async function loadCalendarApi(slug: string): Promise<{ error: 401 | 404 } | { user: User; cal: Calendar }> {
  const user = await getCurrentUser();
  if (!user) return { error: 401 };
  const cal = await getCalendarBySlug(slug);
  if (!cal || !canSeeCalendar(cal, user)) return { error: 404 };
  return { user, cal };
}
