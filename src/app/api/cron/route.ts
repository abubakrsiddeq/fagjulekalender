import crypto from "node:crypto";
import { after } from "next/server";
import { apiError, json } from "@/lib/api";
import { env } from "@/lib/env";
import { claimDailyReminders, cleanup, sendReminders } from "@/lib/cron";

function authorized(request: Request): boolean {
  const secret = env.cronSecret;
  if (!secret) return false;
  const given = new URL(request.url).searchParams.get("key") ?? request.headers.get("x-cron-key") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Run every 5–15 minutes. Sends today's reminder once per door and cleans up old data. */
async function run(request: Request) {
  if (!authorized(request)) return apiError(401);
  const now = new Date();
  const jobs = await claimDailyReminders(now);
  // Respond right away; the e-mails go out after the response so the cron call doesn't time out.
  after(async () => {
    for (const job of jobs) {
      const sent = await sendReminders(job);
      console.log(`Daily reminder: calendar ${job.calendar.id}, door ${job.door}, ${sent} e-mails sent`);
    }
  });
  const cleaned = await cleanup(now);
  return json({ ok: true, reminders: jobs.map((j) => ({ calendar: j.calendar.slug, door: j.door })), cleanup: cleaned });
}

export const GET = run;
export const POST = run;
