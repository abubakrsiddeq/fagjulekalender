import { apiError } from "@/lib/api";
import { loadCalendarApi } from "@/lib/context";
import { getMembership } from "@/lib/calendar";
import { getScoreboard } from "@/lib/leaderboard";
import { csvResponse, toCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/time";

/** Department lead export: participation per member of the lead's own department. */
export async function GET(_request: Request, ctx: RouteContext<"/api/kalender/[slug]/min-avdeling/eksport">) {
  const { slug } = await ctx.params;
  const loaded = await loadCalendarApi(slug);
  if ("error" in loaded) return apiError(loaded.error);
  const { user, cal } = loaded;
  if (user.role !== "lead" && user.role !== "admin") return apiError(403);
  const membership = await getMembership(cal.id, user.id);
  if (!membership) return apiError(403);

  const board = await getScoreboard(cal, { fresh: true });
  const rows = board.participants
    .filter((p) => p.departmentId === membership.department_id)
    .map((p) => [p.displayName, p.email, membership.department_name, p.answered, p.correct, p.points, formatDateTime(p.lastAnswerAt, cal.timezone)]);
  const csv = toCsv([["navn", "epost", "avdeling", "besvart", "riktige", "poeng", "sist_svart"], ...rows], { guardFormulas: true });
  return csvResponse(`deltakelse-${cal.slug}-${membership.department_name}.csv`, csv);
}
