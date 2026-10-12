import { apiError, json } from "@/lib/api";
import { loadCalendarApi } from "@/lib/context";
import { getMembership, getUserProgress } from "@/lib/calendar";

/** GET the participant's door states and score. */
export async function GET(_request: Request, ctx: RouteContext<"/api/kalender/[slug]/luker">) {
  const { slug } = await ctx.params;
  const loaded = await loadCalendarApi(slug);
  if ("error" in loaded) return apiError(loaded.error);
  const { user, cal } = loaded;
  const [progress, membership] = await Promise.all([getUserProgress(cal, user.id, new Date()), getMembership(cal.id, user.id)]);
  return json({
    calendar: { name: cal.name, slug: cal.slug, doorCount: cal.door_count, status: cal.status },
    department: membership ? { id: membership.department_id, name: membership.department_name, status: membership.department_status } : null,
    ...progress,
  });
}
