import "server-only";
import { db } from "./db";
import { env } from "./env";
import { addDays, daysBetween, localYmd, zonedTimeToUtc } from "./time";
import type { Calendar, DepartmentStatus } from "./types";

export const CALENDAR_COLUMNS =
  "id, org_id, name, slug, year, start_date, door_count, timezone, closes_at, points_correct, same_day_bonus, late_answers_allowed, min_answers_to_count, shuffle_options, notify_time, status";

export async function getCalendarBySlug(slug: string): Promise<Calendar | null> {
  return db.queryOne<Calendar>(`SELECT ${CALENDAR_COLUMNS} FROM calendars WHERE slug = ? AND org_id = ?`, [slug, env.orgId]);
}

export async function getCalendarById(id: number): Promise<Calendar | null> {
  return db.queryOne<Calendar>(`SELECT ${CALENDAR_COLUMNS} FROM calendars WHERE id = ? AND org_id = ?`, [id, env.orgId]);
}

export async function listCalendars(statuses?: Calendar["status"][]): Promise<Calendar[]> {
  if (statuses?.length) {
    return db.query<Calendar>(`SELECT ${CALENDAR_COLUMNS} FROM calendars WHERE org_id = ? AND status IN (?) ORDER BY year DESC, id DESC`, [env.orgId, statuses]);
  }
  return db.query<Calendar>(`SELECT ${CALENDAR_COLUMNS} FROM calendars WHERE org_id = ? ORDER BY year DESC, id DESC`, [env.orgId]);
}

// ---------------------------------------------------------------------------
// Door timing (FR-3.2, FR-3.4). All checks happen on the server with these.
// ---------------------------------------------------------------------------

/** Local date of door n: start date + (n − 1) days. */
export function doorDate(cal: Calendar, door: number): string {
  return addDays(cal.start_date, door - 1);
}

/** Door n unlocks at 00:00 local time on its date. */
export function doorOpensAt(cal: Calendar, door: number): Date {
  return zonedTimeToUtc(doorDate(cal, door), "00:00", cal.timezone);
}

/** Last moment (exclusive) an answer to door n is accepted. */
export function doorAnswerableUntil(cal: Calendar, door: number): Date {
  const closes = new Date(cal.closes_at.getTime() + 1000); // closes_at is inclusive (…23:59:59)
  if (cal.late_answers_allowed) return closes;
  const endOfDay = doorOpensAt(cal, door + 1);
  return endOfDay < closes ? endOfDay : closes;
}

export type AnswerBlock = "not_published" | "no_such_door" | "not_open" | "closed";

/** Why door n cannot be answered right now, or null if it can. */
export function answerBlock(cal: Calendar, door: number, now: Date): AnswerBlock | null {
  if (cal.status !== "published") return "not_published";
  if (!Number.isInteger(door) || door < 1 || door > cal.door_count) return "no_such_door";
  if (now < doorOpensAt(cal, door)) return "not_open";
  if (now >= doorAnswerableUntil(cal, door)) return "closed";
  return null;
}

/** The door whose date is today (local), or null outside the calendar. */
export function todayDoor(cal: Calendar, now: Date): number | null {
  const n = daysBetween(cal.start_date, localYmd(now, cal.timezone)) + 1;
  return n >= 1 && n <= cal.door_count ? n : null;
}

/** FR-2.4: participants may change department until the first door opens. */
export function canChangeDepartment(cal: Calendar, now: Date): boolean {
  return now < doorOpensAt(cal, 1);
}

export function isClosed(cal: Calendar, now: Date): boolean {
  return now > cal.closes_at;
}

export function pointsFor(cal: Calendar, isCorrect: boolean, onDoorDay: boolean): number {
  if (!isCorrect) return 0;
  return cal.points_correct + (onDoorDay ? cal.same_day_bonus : 0);
}

// ---------------------------------------------------------------------------
// Membership and per-user door overview
// ---------------------------------------------------------------------------

export interface MembershipInfo {
  department_id: number;
  department_name: string;
  department_status: DepartmentStatus;
  joined_at: Date;
}

export async function getMembership(calendarId: number, userId: number): Promise<MembershipInfo | null> {
  return db.queryOne<MembershipInfo>(
    `SELECT m.department_id, d.name AS department_name, d.status AS department_status, m.joined_at
       FROM memberships m JOIN departments d ON d.id = m.department_id
      WHERE m.calendar_id = ? AND m.user_id = ?`,
    [calendarId, userId],
  );
}

export type DoorState = "locked" | "ready" | "correct" | "wrong" | "closed" | "empty";

export interface DoorInfo {
  door: number;
  date: string;
  state: DoorState;
  isToday: boolean;
  topic: string | null;
  points: number;
}

export interface UserProgress {
  doors: DoorInfo[];
  answered: number;
  correct: number;
  points: number;
}

export async function getUserProgress(cal: Calendar, userId: number | null, now: Date): Promise<UserProgress> {
  const questions = await db.query<{ door_number: number; topic: string }>(
    "SELECT door_number, topic FROM questions WHERE calendar_id = ?",
    [cal.id],
  );
  const answers = userId
    ? await db.query<{ door_number: number; is_correct: number; on_door_day: number }>(
        `SELECT q.door_number, a.is_correct, a.on_door_day
           FROM answers a JOIN questions q ON q.id = a.question_id
          WHERE a.calendar_id = ? AND a.user_id = ?`,
        [cal.id, userId],
      )
    : [];

  const topicByDoor = new Map(questions.map((q) => [q.door_number, q.topic]));
  const answerByDoor = new Map(answers.map((a) => [a.door_number, a]));
  const today = todayDoor(cal, now);

  let correct = 0;
  let points = 0;
  const doors: DoorInfo[] = [];
  for (let n = 1; n <= cal.door_count; n++) {
    const a = answerByDoor.get(n);
    const topic = topicByDoor.get(n) ?? null;
    let state: DoorState;
    let doorPoints = 0;
    if (a) {
      state = a.is_correct ? "correct" : "wrong";
      doorPoints = pointsFor(cal, !!a.is_correct, !!a.on_door_day);
      if (a.is_correct) correct++;
      points += doorPoints;
    } else if (now < doorOpensAt(cal, n)) {
      state = "locked";
    } else if (!topic) {
      state = "empty";
    } else if (cal.status !== "published" || now >= doorAnswerableUntil(cal, n)) {
      state = "closed";
    } else {
      state = "ready";
    }
    doors.push({ door: n, date: doorDate(cal, n), state, isToday: n === today, topic: state === "locked" ? null : topic, points: doorPoints });
  }
  return { doors, answered: answers.length, correct, points };
}
