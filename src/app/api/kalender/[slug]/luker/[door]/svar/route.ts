import { apiError, isSameOrigin, json } from "@/lib/api";
import { loadCalendarApi } from "@/lib/context";
import { SUBMIT_ERROR_STATUS, submitAnswer } from "@/lib/answers";
import { rateLimit } from "@/lib/ratelimit";
import { ensureMembership } from "@/lib/registration";
import { getT } from "@/i18n/server";


/** POST { optionId } — checks, stores and scores one answer on the server. */
export async function POST(request: Request, ctx: RouteContext<"/api/kalender/[slug]/luker/[door]/svar">) {
  if (!(await isSameOrigin())) return apiError(403, "bad_origin");
  const { slug, door } = await ctx.params;
  const loaded = await loadCalendarApi(slug);
  if ("error" in loaded) return apiError(loaded.error);
  const { user, cal } = loaded;
  const t = await getT();

  if (!rateLimit(`answer:${user.id}`, 30, 60_000)) return apiError(429, "rate_limited");
  if (!user.registered_at) return apiError(403, "registration_required", t.registration.needed);
  await ensureMembership(cal, user);

  const body = (await request.json().catch(() => null)) as { optionId?: unknown } | null;
  const optionId = Number(body?.optionId);
  if (!Number.isInteger(optionId) || optionId <= 0) return apiError(400, "invalid_option", t.answerErrors.invalid_option);

  const res = await submitAnswer(cal, Number(door), user.id, optionId);
  if (!res.ok) return apiError(SUBMIT_ERROR_STATUS[res.error], res.error, t.answerErrors[res.error]);
  return json({ result: res.result }, 201);
}
