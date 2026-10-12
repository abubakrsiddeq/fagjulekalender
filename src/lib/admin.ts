import "server-only";
import { db, isDuplicateKey, transaction } from "./db";
import { env } from "./env";
import { logAudit } from "./audit";
import { getCalendarById } from "./calendar";
import { addDays, fromLocalInput, isValidTimeZone, localHm, localYmd, toLocalInput, zonedTimeToUtc } from "./time";
import type { Calendar } from "./types";

// ---------------------------------------------------------------------------
// Calendars (FR-3.1, FR-8.1)
// ---------------------------------------------------------------------------

export interface CalendarInput {
  name: string;
  slug: string;
  year: number;
  startDate: string;
  doorCount: number;
  timezone: string;
  closesAtLocal: string;
  pointsCorrect: number;
  sameDayBonus: number;
  lateAnswersAllowed: boolean;
  minAnswersToCount: number;
  shuffleOptions: boolean;
  notifyTime: string | null;
}

export function parseCalendarForm(fd: FormData): CalendarInput {
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const n = (k: string) => Number(s(k));
  return {
    name: s("name"),
    slug: s("slug").toLowerCase(),
    year: n("year"),
    startDate: s("start_date"),
    doorCount: n("door_count"),
    timezone: s("timezone") || "Europe/Oslo",
    closesAtLocal: s("closes_at"),
    pointsCorrect: n("points_correct"),
    sameDayBonus: n("same_day_bonus"),
    lateAnswersAllowed: fd.get("late_answers_allowed") === "on",
    minAnswersToCount: n("min_answers_to_count"),
    shuffleOptions: fd.get("shuffle_options") === "on",
    notifyTime: s("notify_time") || null,
  };
}

export function calendarToInput(cal: Calendar): CalendarInput {
  return {
    name: cal.name,
    slug: cal.slug,
    year: cal.year,
    startDate: cal.start_date,
    doorCount: cal.door_count,
    timezone: cal.timezone,
    closesAtLocal: toLocalInput(cal.closes_at, cal.timezone),
    pointsCorrect: cal.points_correct,
    sameDayBonus: cal.same_day_bonus,
    lateAnswersAllowed: !!cal.late_answers_allowed,
    minAnswersToCount: cal.min_answers_to_count,
    shuffleOptions: !!cal.shuffle_options,
    notifyTime: cal.notify_time,
  };
}

export function defaultCalendarInput(now = new Date()): CalendarInput {
  const year = now.getUTCMonth() === 11 && now.getUTCDate() > 24 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return {
    name: `Fagjulekalender ${year}`,
    slug: String(year),
    year,
    startDate: `${year}-12-01`,
    doorCount: 24,
    timezone: "Europe/Oslo",
    closesAtLocal: `${year}-12-31T23:59`,
    pointsCorrect: 10,
    sameDayBonus: 0,
    lateAnswersAllowed: true,
    minAnswersToCount: 1,
    shuffleOptions: false,
    notifyTime: "07:30",
  };
}

function validateCalendar(input: CalendarInput): { errors: string[]; closesAt: Date | null } {
  const errors: string[] = [];
  if (!input.name || input.name.length > 200) errors.push("Navn må fylles ut (maks 200 tegn).");
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(input.slug)) errors.push("Lenke-navn kan bare ha små bokstaver a–z, tall og bindestrek.");
  if (!Number.isInteger(input.year) || input.year < 2020 || input.year > 2100) errors.push("Ugyldig år.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) errors.push("Ugyldig startdato.");
  if (!Number.isInteger(input.doorCount) || input.doorCount < 1 || input.doorCount > 31) errors.push("Antall luker må være 1–31.");
  if (!isValidTimeZone(input.timezone)) errors.push("Ugyldig tidssone.");
  for (const [label, v] of [
    ["Poeng for riktig svar", input.pointsCorrect],
    ["Bonus", input.sameDayBonus],
    ["Minimum antall svar", input.minAnswersToCount],
  ] as const) {
    if (!Number.isInteger(v) || v < 0 || v > 1000) errors.push(`${label} må være et heltall fra 0.`);
  }
  if (input.notifyTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.notifyTime)) errors.push("Ugyldig tidspunkt for e-post.");
  let closesAt: Date | null = null;
  if (!errors.length) {
    const parsed = fromLocalInput(input.closesAtLocal, input.timezone);
    if (!parsed) errors.push("Ugyldig stengetidspunkt.");
    else {
      closesAt = new Date(parsed.getTime() + 59_000); // inclusive minute: 23:59 → 23:59:59
      const lastDoor = zonedTimeToUtc(addDays(input.startDate, input.doorCount - 1), "00:00", input.timezone);
      if (closesAt <= lastDoor) errors.push("Kalenderen må stenge etter at siste luke har åpnet.");
    }
  }
  return { errors, closesAt };
}

function calendarValues(input: CalendarInput, closesAt: Date) {
  return [
    input.name,
    input.slug,
    input.year,
    input.startDate,
    input.doorCount,
    input.timezone,
    closesAt,
    input.pointsCorrect,
    input.sameDayBonus,
    input.lateAnswersAllowed ? 1 : 0,
    input.minAnswersToCount,
    input.shuffleOptions ? 1 : 0,
    input.notifyTime,
  ];
}

export async function createCalendar(input: CalendarInput, actorId: number): Promise<{ id: number } | { errors: string[] }> {
  const { errors, closesAt } = validateCalendar(input);
  if (errors.length) return { errors };
  try {
    const res = await db.execute(
      `INSERT INTO calendars (org_id, name, slug, year, start_date, door_count, timezone, closes_at, points_correct, same_day_bonus,
         late_answers_allowed, min_answers_to_count, shuffle_options, notify_time, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [env.orgId, ...calendarValues(input, closesAt!), new Date()],
    );
    await logAudit({ userId: actorId, action: "calendar.create", entity: "calendar", entityId: res.insertId, after: input });
    return { id: res.insertId };
  } catch (err) {
    if (isDuplicateKey(err)) return { errors: [`Lenke-navnet «${input.slug}» er allerede i bruk.`] };
    throw err;
  }
}

export async function countAnswers(calendarId: number): Promise<number> {
  const r = await db.queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM answers WHERE calendar_id = ?", [calendarId]);
  return Number(r?.n ?? 0);
}

export async function updateCalendar(cal: Calendar, input: CalendarInput, actorId: number): Promise<{ ok: true } | { errors: string[] }> {
  const { errors, closesAt } = validateCalendar(input);
  if (errors.length) return { errors };
  if ((await countAnswers(cal.id)) > 0) {
    // Moving doors after people have answered would change which answers were on time.
    if (input.startDate !== cal.start_date || input.doorCount !== cal.door_count || input.timezone !== cal.timezone) {
      return { errors: ["Startdato, antall luker og tidssone kan ikke endres etter at noen har svart."] };
    }
  }
  try {
    await db.execute(
      `UPDATE calendars SET name = ?, slug = ?, year = ?, start_date = ?, door_count = ?, timezone = ?, closes_at = ?, points_correct = ?,
         same_day_bonus = ?, late_answers_allowed = ?, min_answers_to_count = ?, shuffle_options = ?, notify_time = ?
       WHERE id = ? AND org_id = ?`,
      [...calendarValues(input, closesAt!), cal.id, env.orgId],
    );
  } catch (err) {
    if (isDuplicateKey(err)) return { errors: [`Lenke-navnet «${input.slug}» er allerede i bruk.`] };
    throw err;
  }
  await logAudit({ userId: actorId, action: "calendar.update", entity: "calendar", entityId: cal.id, before: calendarToInput(cal), after: input });
  return { ok: true };
}

/** FR-8.1: copies settings and questions (not answers) into a new draft for another year. */
export async function copyCalendar(cal: Calendar, year: number, slug: string, actorId: number): Promise<{ id: number } | { errors: string[] }> {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return { errors: ["Ugyldig år."] };
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) return { errors: ["Ugyldig lenke-navn."] };
  const shift = year - cal.year;
  const shiftYear = (ymd: string) => `${Number(ymd.slice(0, 4)) + shift}${ymd.slice(4)}`;
  const closesLocal = toLocalInput(cal.closes_at, cal.timezone);
  const closesAt = new Date(zonedTimeToUtc(shiftYear(closesLocal.slice(0, 10)), closesLocal.slice(11), cal.timezone).getTime() + 59_000);
  const name = cal.name.includes(String(cal.year)) ? cal.name.replaceAll(String(cal.year), String(year)) : `${cal.name} ${year}`;

  try {
    const newId = await transaction(async (tx) => {
      const res = await tx.execute(
        `INSERT INTO calendars (org_id, name, slug, year, start_date, door_count, timezone, closes_at, points_correct, same_day_bonus,
           late_answers_allowed, min_answers_to_count, shuffle_options, notify_time, status, created_at)
         SELECT org_id, ?, ?, ?, ?, door_count, timezone, ?, points_correct, same_day_bonus, late_answers_allowed,
                min_answers_to_count, shuffle_options, notify_time, 'draft', ? FROM calendars WHERE id = ?`,
        [name, slug, year, shiftYear(cal.start_date), closesAt, new Date(), cal.id],
      );
      const id = res.insertId;
      const questions = await tx.query<{ id: number }>("SELECT id FROM questions WHERE calendar_id = ? ORDER BY door_number", [cal.id]);
      for (const q of questions) {
        // Approval is not copied: the new year's questions must be reviewed again.
        const qr = await tx.execute(
          `INSERT INTO questions (calendar_id, door_number, topic, text, image_url, explanation, source_title, source_eqs_id, source_revision_date, created_at)
           SELECT ?, door_number, topic, text, image_url, explanation, source_title, source_eqs_id, source_revision_date, ? FROM questions WHERE id = ?`,
          [id, new Date(), q.id],
        );
        await tx.execute(
          "INSERT INTO question_options (question_id, text, is_correct, sort_order) SELECT ?, text, is_correct, sort_order FROM question_options WHERE question_id = ?",
          [qr.insertId, q.id],
        );
      }
      await logAudit({ userId: actorId, action: "calendar.copy", entity: "calendar", entityId: id, after: { from: cal.id, year, slug, questions: questions.length } }, tx);
      return id;
    });
    return { id: newId };
  } catch (err) {
    if (isDuplicateKey(err)) return { errors: [`Lenke-navnet «${slug}» er allerede i bruk.`] };
    throw err;
  }
}

export async function setCalendarStatus(cal: Calendar, status: Calendar["status"], actorId: number) {
  await db.execute("UPDATE calendars SET status = ? WHERE id = ? AND org_id = ?", [status, cal.id, env.orgId]);
  await logAudit({ userId: actorId, action: "calendar.status", entity: "calendar", entityId: cal.id, before: { status: cal.status }, after: { status } });
}

export async function calendarStats(calendarIds: number[]) {
  if (!calendarIds.length) return new Map<number, { questions: number; approved: number; members: number; answers: number }>();
  const [q, m, a] = await Promise.all([
    db.query<{ calendar_id: number; n: number; approved: number }>(
      "SELECT calendar_id, COUNT(*) AS n, SUM(approved_at IS NOT NULL) AS approved FROM questions WHERE calendar_id IN (?) GROUP BY calendar_id",
      [calendarIds],
    ),
    db.query<{ calendar_id: number; n: number }>("SELECT calendar_id, COUNT(*) AS n FROM memberships WHERE calendar_id IN (?) GROUP BY calendar_id", [calendarIds]),
    db.query<{ calendar_id: number; n: number }>("SELECT calendar_id, COUNT(*) AS n FROM answers WHERE calendar_id IN (?) GROUP BY calendar_id", [calendarIds]),
  ]);
  const out = new Map<number, { questions: number; approved: number; members: number; answers: number }>();
  for (const id of calendarIds) {
    const qq = q.find((r) => r.calendar_id === id);
    out.set(id, {
      questions: Number(qq?.n ?? 0),
      approved: Number(qq?.approved ?? 0),
      members: Number(m.find((r) => r.calendar_id === id)?.n ?? 0),
      answers: Number(a.find((r) => r.calendar_id === id)?.n ?? 0),
    });
  }
  return out;
}

export async function requireCalendar(id: string | number): Promise<Calendar | null> {
  const n = Number(id);
  return Number.isInteger(n) ? getCalendarById(n) : null;
}

// ---------------------------------------------------------------------------
// Participation report (FR-8.6)
// ---------------------------------------------------------------------------

export interface ParticipationReport {
  dates: string[];
  departments: { id: number; name: string; status: string; members: number; active: number; answers: number; perDay: Record<string, number>; later: number }[];
  signups: { date: string; total: number; byDepartment: Record<string, number> }[];
}

export async function participationReport(cal: Calendar): Promise<ParticipationReport> {
  const members = await db.query<{ department_id: number; name: string; status: string; user_id: number; joined_at: Date }>(
    `SELECT m.department_id, d.name, d.status, m.user_id, m.joined_at
       FROM memberships m JOIN departments d ON d.id = m.department_id WHERE m.calendar_id = ?`,
    [cal.id],
  );
  const answers = await db.query<{ department_id: number; user_id: number; answered_at: Date }>(
    `SELECT m.department_id, a.user_id, a.answered_at
       FROM answers a JOIN memberships m ON m.calendar_id = a.calendar_id AND m.user_id = a.user_id
      WHERE a.calendar_id = ?`,
    [cal.id],
  );
  const dates = Array.from({ length: cal.door_count }, (_, i) => addDays(cal.start_date, i));
  const dateSet = new Set(dates);
  const depts = new Map<number, ParticipationReport["departments"][number]>();
  const activeUsers = new Map<number, Set<number>>();
  for (const m of members) {
    let d = depts.get(m.department_id);
    if (!d) {
      d = { id: m.department_id, name: m.name, status: m.status, members: 0, active: 0, answers: 0, perDay: {}, later: 0 };
      depts.set(m.department_id, d);
      activeUsers.set(m.department_id, new Set());
    }
    d.members++;
  }
  for (const a of answers) {
    const d = depts.get(a.department_id);
    if (!d) continue;
    d.answers++;
    activeUsers.get(a.department_id)!.add(a.user_id);
    const day = localYmd(a.answered_at, cal.timezone);
    if (dateSet.has(day)) d.perDay[day] = (d.perDay[day] ?? 0) + 1;
    else d.later++;
  }
  for (const d of depts.values()) d.active = activeUsers.get(d.id)!.size;

  const signupMap = new Map<string, { date: string; total: number; byDepartment: Record<string, number> }>();
  for (const m of members) {
    const day = localYmd(m.joined_at, cal.timezone);
    let s = signupMap.get(day);
    if (!s) {
      s = { date: day, total: 0, byDepartment: {} };
      signupMap.set(day, s);
    }
    s.total++;
    s.byDepartment[m.name] = (s.byDepartment[m.name] ?? 0) + 1;
  }
  return {
    dates,
    departments: [...depts.values()].sort((a, b) => a.name.localeCompare(b.name, "nb")),
    signups: [...signupMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function answersForExport(cal: Calendar) {
  return db.query<{
    door_number: number;
    display_name: string;
    email: string;
    ressursnummer: string | null;
    department: string;
    option_id: number;
    is_correct: number;
    on_door_day: number;
    answered_at: Date;
    question_id: number;
  }>(
    `SELECT q.door_number, u.display_name, u.email, u.ressursnummer, d.name AS department, a.option_id, a.is_correct, a.on_door_day, a.answered_at, a.question_id
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       JOIN users u ON u.id = a.user_id
  LEFT JOIN memberships m ON m.calendar_id = a.calendar_id AND m.user_id = a.user_id
  LEFT JOIN departments d ON d.id = m.department_id
      WHERE a.calendar_id = ?
   ORDER BY q.door_number, a.answered_at`,
    [cal.id],
  );
}

export function localTimeLabel(date: Date, cal: Calendar) {
  return `${localYmd(date, cal.timezone)} ${localHm(date, cal.timezone)}`;
}
