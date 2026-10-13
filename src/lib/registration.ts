import "server-only";
import { db } from "./db";
import { env } from "./env";
import { canChangeDepartment, getMembership, isClosed, listCalendars, type MembershipInfo } from "./calendar";
import { getDepartment, listDepartments, proposeDepartment, setMembership } from "./departments";
import { invalidateScoreboard } from "./leaderboard";
import { getOrg } from "./org";
import { getT } from "@/i18n/server";
import type { Dictionary } from "@/i18n";
import type { Calendar, User } from "./types";

// Registration: Kommune, Bydel, Avdeling eller seksjon, Ressursnummer, Ansvarlig.
// "Avdeling eller seksjon" is the department the participant competes for.

export interface RegistrationInput {
  displayName: string;
  kommune: string;
  bydel: string;
  ressursnummer: string;
  ansvarlig: string;
  departmentId: number | null;
  proposal: string;
  notify: boolean;
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** "Oslo kommune" → "Oslo", so reports group the same municipality together. */
export function cleanKommune(raw: string): string {
  return squash(raw).replace(/\s+kommune$/i, "");
}

/** "Bydel Frogner" → "Frogner". */
export function cleanBydel(raw: string): string {
  return squash(raw).replace(/^bydel\s+/i, "");
}

export function parseRegistration(fd: FormData): RegistrationInput {
  const s = (k: string) => String(fd.get(k) ?? "");
  const dept = Number(s("department"));
  return {
    displayName: squash(s("display_name")),
    kommune: cleanKommune(s("kommune")),
    bydel: cleanBydel(s("bydel")),
    ressursnummer: squash(s("ressursnummer")),
    ansvarlig: squash(s("ansvarlig")),
    departmentId: Number.isInteger(dept) && dept > 0 ? dept : null,
    proposal: squash(s("proposal")),
    notify: fd.get("notify_daily") === "on",
  };
}

function validate(input: RegistrationInput, t: Dictionary): string[] {
  const r = t.registration;
  const errors: string[] = [];
  const fields: [string, string, number, boolean][] = [
    [r.name, input.displayName, 100, true],
    [r.kommune, input.kommune, 100, true],
    [r.bydel, input.bydel, 100, false],
    [r.ressursnummer, input.ressursnummer, 40, true],
    [r.ansvarlig, input.ansvarlig, 120, true],
  ];
  for (const [label, value, max, required] of fields) {
    if (required && !value) errors.push(r.required(label));
    else if (value.length > max) errors.push(r.tooLong(label, max));
  }
  return errors;
}

export type SaveRegistrationResult = { ok: true; lockedCalendars: string[] } | { ok: false; errors: string[] };

export async function saveRegistration(user: User, input: RegistrationInput): Promise<SaveRegistrationResult> {
  const t = await getT();
  const errors = validate(input, t);
  const org = await getOrg();

  let departmentId: number | null = null;
  if (input.proposal && org.allow_department_proposals) {
    if (!errors.length) {
      const res = await proposeDepartment(input.proposal, user.id);
      if ("error" in res) errors.push(res.error);
      else departmentId = res.department.id;
    }
  } else {
    const dept = input.departmentId ? await getDepartment(input.departmentId) : null;
    // Active departments, or a pending one this participant proposed or already belongs to.
    const ok = dept && (dept.status === "active" || (dept.status === "pending" && (dept.proposed_by === user.id || user.department_id === dept.id)));
    if (!ok) errors.push(t.registration.required(t.registration.avdeling));
    else departmentId = dept.id;
  }
  if (errors.length || departmentId == null) return { ok: false, errors };

  const now = new Date();
  await db.execute(
    `UPDATE users SET display_name = ?, kommune = ?, bydel = ?, ressursnummer = ?, ansvarlig = ?, department_id = ?,
       hide_name = 0, notify_daily = ?, registered_at = COALESCE(registered_at, ?)
     WHERE id = ? AND org_id = ?`,
    [
      input.displayName,
      input.kommune,
      input.bydel || null,
      input.ressursnummer,
      input.ansvarlig,
      departmentId,
      input.notify ? 1 : 0,
      now,
      user.id,
      env.orgId,
    ],
  );

  // Join (or move within) every open calendar. Moving is only allowed before door 1 (FR-2.4).
  const lockedCalendars: string[] = [];
  for (const cal of await listCalendars(["published"])) {
    if (isClosed(cal, now)) continue;
    const membership = await getMembership(cal.id, user.id);
    if (membership?.department_id === departmentId) continue;
    if (membership && !canChangeDepartment(cal, now) && user.role !== "admin") {
      lockedCalendars.push(cal.name);
      continue;
    }
    await setMembership(cal.id, user.id, departmentId);
    invalidateScoreboard(cal.id);
  }
  return { ok: true, lockedCalendars };
}

/** Joins a published calendar with the registered department, if the participant hasn't joined yet. */
export async function ensureMembership(cal: Calendar, user: User): Promise<MembershipInfo | null> {
  const existing = await getMembership(cal.id, user.id);
  if (existing || cal.status !== "published" || isClosed(cal, new Date()) || !user.department_id) return existing;
  const dept = await getDepartment(user.department_id);
  if (!dept || dept.status === "archived") return null;
  await setMembership(cal.id, user.id, dept.id);
  invalidateScoreboard(cal.id);
  return getMembership(cal.id, user.id);
}

/** Choices and suggestions for the registration form. */
export async function registrationFormData(user: User) {
  const org = await getOrg();
  const departments = (await listDepartments(["active"])).map((d) => ({ id: d.id, name: d.name, pending: false }));
  if (user.department_id && !departments.some((d) => d.id === user.department_id)) {
    const d = await getDepartment(user.department_id);
    if (d?.status === "pending") departments.push({ id: d.id, name: d.name, pending: true });
  }
  const [kommuner, bydeler] = await Promise.all(
    (["kommune", "bydel"] as const).map(async (col) =>
      (
        await db.query<{ v: string }>(
          `SELECT ${col} AS v, COUNT(*) AS n FROM users WHERE org_id = ? AND ${col} IS NOT NULL AND ${col} <> '' AND anonymized_at IS NULL
            GROUP BY ${col} ORDER BY n DESC, v LIMIT 100`,
          [env.orgId],
        )
      ).map((r) => r.v),
    ),
  );
  return { departments, allowProposals: !!org.allow_department_proposals, kommuner, bydeler };
}

export function registrationInitial(user: User) {
  return {
    displayName: user.display_name,
    kommune: user.kommune ?? "",
    bydel: user.bydel ?? "",
    ressursnummer: user.ressursnummer ?? "",
    ansvarlig: user.ansvarlig ?? "",
    departmentId: user.department_id,
    notify: !!user.notify_daily,
  };
}
