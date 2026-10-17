import { apiError, json } from "@/lib/api";
import { loadCalendarApi } from "@/lib/context";
import { answerBlock, doorOpensAt } from "@/lib/calendar";
import { getAnswerResult, getPublicQuestion } from "@/lib/answers";

/** GET one door. The answer key is only included after the participant has answered. */
export async function GET(_request: Request, ctx: RouteContext<"/api/kalender/[slug]/luker/[door]">) {
  const { slug, door: doorParam } = await ctx.params;
  const loaded = await loadCalendarApi(slug);
  if ("error" in loaded) return apiError(loaded.error);
  const { user, cal } = loaded;

  const door = Number(doorParam);
  if (!Number.isInteger(door) || door < 1 || door > cal.door_count) return apiError(404);
  const now = new Date();
  const opensAt = doorOpensAt(cal, door);
  if (now < opensAt) return json({ door, state: "locked", opensAt: opensAt.toISOString() });

  const question = await getPublicQuestion(cal, door, user.id);
  if (!question) return json({ door, state: "empty" });
  const result = await getAnswerResult(cal, question.id, user.id);
  const block = answerBlock(cal, door, now);
  return json({
    door,
    state: result ? (result.isCorrect ? "correct" : "wrong") : block ? "missed" : "ready",
    question,
    result,
  });
}
