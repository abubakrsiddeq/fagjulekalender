import { apiError, json } from "@/lib/api";
import { loadCalendarApi } from "@/lib/context";
import { getScoreboard, topParticipants } from "@/lib/leaderboard";
import { getT } from "@/i18n/server";

/** GET department leaderboard and top list (for polling or external screens). */
export async function GET(_request: Request, ctx: RouteContext<"/api/kalender/[slug]/resultater">) {
  const { slug } = await ctx.params;
  const loaded = await loadCalendarApi(slug);
  if ("error" in loaded) return apiError(loaded.error);
  const board = await getScoreboard(loaded.cal);
  const t = await getT();
  return json({
    computedAt: board.computedAt.toISOString(),
    departments: board.departments.map(({ rank, departmentId, name, participants, totalPoints, average }) => ({
      rank,
      departmentId,
      name,
      participants,
      totalPoints,
      average: Math.round(average * 100) / 100,
    })),
    top: topParticipants(board, 15, t.results.hidden),
  });
}
