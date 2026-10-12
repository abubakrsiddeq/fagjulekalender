import "server-only";
import { db } from "./db";
import type { Calendar, DepartmentStatus } from "./types";

// Scores are always derived from stored answers (FR-5.3). Results are cached
// in memory for a few seconds so the morning peak doesn't recompute on every
// page view; FR-6.4 only asks for updates within one minute.

export interface ParticipantScore {
  userId: number;
  displayName: string;
  email: string;
  hideName: boolean;
  kommune: string | null;
  bydel: string | null;
  ressursnummer: string | null;
  ansvarlig: string | null;
  departmentId: number;
  departmentName: string;
  departmentStatus: DepartmentStatus;
  answered: number;
  correct: number;
  points: number;
  lastCorrectAt: Date | null;
  lastAnswerAt: Date | null;
  counted: boolean;
}

export interface DepartmentScore {
  rank: number;
  departmentId: number;
  name: string;
  members: number;
  participants: number;
  totalPoints: number;
  average: number;
  lastCorrectAt: Date | null;
}

export interface Scoreboard {
  computedAt: Date;
  participants: ParticipantScore[];
  departments: DepartmentScore[];
}

const TTL_MS = 15_000;
const cache = new Map<number, { at: number; board: Scoreboard }>();

export function invalidateScoreboard(calendarId: number) {
  cache.delete(calendarId);
}

export async function getScoreboard(cal: Calendar, { fresh = false } = {}): Promise<Scoreboard> {
  const hit = cache.get(cal.id);
  if (!fresh && hit && Date.now() - hit.at < TTL_MS) return hit.board;
  const board = await computeScoreboard(cal);
  cache.set(cal.id, { at: Date.now(), board });
  return board;
}

async function computeScoreboard(cal: Calendar): Promise<Scoreboard> {
  const rows = await db.query<{
    user_id: number;
    display_name: string;
    email: string;
    hide_name: number;
    kommune: string | null;
    bydel: string | null;
    ressursnummer: string | null;
    ansvarlig: string | null;
    department_id: number;
    department_name: string;
    department_status: DepartmentStatus;
    answered: number;
    correct: number;
    points: number;
    last_correct_at: Date | null;
    last_answer_at: Date | null;
  }>(
    `SELECT m.user_id, u.display_name, u.email, u.hide_name, u.kommune, u.bydel, u.ressursnummer, u.ansvarlig,
            m.department_id, d.name AS department_name, d.status AS department_status,
            COUNT(a.id) AS answered,
            COALESCE(SUM(a.is_correct), 0) AS correct,
            COALESCE(SUM(CASE WHEN a.is_correct = 1 THEN ? + IF(a.on_door_day = 1, ?, 0) ELSE 0 END), 0) AS points,
            MAX(CASE WHEN a.is_correct = 1 THEN a.answered_at END) AS last_correct_at,
            MAX(a.answered_at) AS last_answer_at
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       JOIN departments d ON d.id = m.department_id
  LEFT JOIN answers a ON a.calendar_id = m.calendar_id AND a.user_id = m.user_id
      WHERE m.calendar_id = ?
   GROUP BY m.user_id, u.display_name, u.email, u.hide_name, u.kommune, u.bydel, u.ressursnummer, u.ansvarlig,
            m.department_id, d.name, d.status`,
    [cal.points_correct, cal.same_day_bonus, cal.id],
  );

  const minAnswers = cal.min_answers_to_count;
  const participants: ParticipantScore[] = rows.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    email: r.email,
    hideName: !!r.hide_name,
    kommune: r.kommune,
    bydel: r.bydel,
    ressursnummer: r.ressursnummer,
    ansvarlig: r.ansvarlig,
    departmentId: r.department_id,
    departmentName: r.department_name,
    departmentStatus: r.department_status,
    answered: Number(r.answered),
    correct: Number(r.correct),
    points: Number(r.points),
    lastCorrectAt: r.last_correct_at,
    lastAnswerAt: r.last_answer_at,
    counted: Number(r.answered) >= minAnswers,
  }));

  // FR-6.1/6.2: average = points of counted participants / number of counted participants.
  const byDept = new Map<number, DepartmentScore>();
  for (const p of participants) {
    if (p.departmentStatus !== "active") continue; // pending/archived departments are not ranked
    let d = byDept.get(p.departmentId);
    if (!d) {
      d = { rank: 0, departmentId: p.departmentId, name: p.departmentName, members: 0, participants: 0, totalPoints: 0, average: 0, lastCorrectAt: null };
      byDept.set(p.departmentId, d);
    }
    d.members++;
    if (!p.counted) continue;
    d.participants++;
    d.totalPoints += p.points;
    if (p.lastCorrectAt && (!d.lastCorrectAt || p.lastCorrectAt > d.lastCorrectAt)) d.lastCorrectAt = p.lastCorrectAt;
  }
  const departments = [...byDept.values()];
  for (const d of departments) d.average = d.participants ? d.totalPoints / d.participants : 0;

  // FR-6.5 tie-break: higher total, then earlier time of last correct answer.
  departments.sort(
    (a, b) =>
      b.average - a.average ||
      b.totalPoints - a.totalPoints ||
      timeOrInfinity(a.lastCorrectAt) - timeOrInfinity(b.lastCorrectAt) ||
      a.name.localeCompare(b.name, "nb"),
  );
  departments.forEach((d, i) => {
    const prev = departments[i - 1];
    const tied =
      prev && prev.average === d.average && prev.totalPoints === d.totalPoints && timeOrInfinity(prev.lastCorrectAt) === timeOrInfinity(d.lastCorrectAt);
    d.rank = tied ? prev.rank : i + 1;
  });

  return { computedAt: new Date(), participants, departments };
}

function timeOrInfinity(d: Date | null): number {
  return d ? d.getTime() : Number.POSITIVE_INFINITY;
}

export interface TopEntry {
  rank: number;
  userId: number;
  name: string;
  departmentName: string;
  points: number;
}

/** FR-6.3: individual top list. Hidden names show as «Kollega». */
export function topParticipants(board: Scoreboard, limit = 15, hiddenLabel = "Kollega"): TopEntry[] {
  const list = board.participants
    .filter((p) => p.answered > 0)
    .sort(
      (a, b) =>
        b.points - a.points ||
        timeOrInfinity(a.lastCorrectAt) - timeOrInfinity(b.lastCorrectAt) ||
        a.displayName.localeCompare(b.displayName, "nb"),
    )
    .slice(0, limit);
  const out: TopEntry[] = [];
  list.forEach((p, i) => {
    const prev = list[i - 1];
    const tied = prev && prev.points === p.points && timeOrInfinity(prev.lastCorrectAt) === timeOrInfinity(p.lastCorrectAt);
    out.push({
      rank: tied ? out[i - 1].rank : i + 1,
      userId: p.userId,
      name: p.hideName ? hiddenLabel : p.displayName,
      departmentName: p.departmentStatus === "active" ? p.departmentName : "–",
      points: p.points,
    });
  });
  return out;
}
