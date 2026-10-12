import "server-only";
import { db, isDuplicateKey, transaction } from "./db";
import { env } from "./env";
import { logAudit } from "./audit";
import type { Department } from "./types";

const COLS = "id, org_id, name, status, proposed_by, merged_into_id, created_at";

export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 120);
}

/** "Sone 2", "sone2" and " SONE  2 " all compare equal. */
export function nameKey(name: string): string {
  return name.toLocaleLowerCase("nb").replace(/[\s\-_.]+/g, "");
}

export async function listDepartments(statuses: Department["status"][] = ["active"]): Promise<Department[]> {
  return db.query<Department>(`SELECT ${COLS} FROM departments WHERE org_id = ? AND status IN (?) ORDER BY name`, [env.orgId, statuses]);
}

export async function getDepartment(id: number): Promise<Department | null> {
  return db.queryOne<Department>(`SELECT ${COLS} FROM departments WHERE id = ? AND org_id = ?`, [id, env.orgId]);
}

export async function findSimilarDepartment(name: string): Promise<Department | null> {
  const all = await listDepartments(["active", "pending", "archived"]);
  const key = nameKey(name);
  return all.find((d) => nameKey(d.name) === key) ?? null;
}

/** FR-2.3: a participant proposes a department; it stays pending until an admin approves it. */
export async function proposeDepartment(name: string, userId: number): Promise<{ department: Department; existed: boolean } | { error: string }> {
  const clean = cleanName(name);
  if (clean.length < 2) return { error: "Skriv inn navnet på avdelingen." };
  const similar = await findSimilarDepartment(clean);
  if (similar) {
    if (similar.status === "archived") return { error: `Avdelingen «${similar.name}» er arkivert. Kontakt administrator.` };
    return { department: similar, existed: true };
  }
  try {
    const res = await db.execute("INSERT INTO departments (org_id, name, status, proposed_by, created_at) VALUES (?, ?, 'pending', ?, ?)", [
      env.orgId,
      clean,
      userId,
      new Date(),
    ]);
    await logAudit({ userId, action: "department.propose", entity: "department", entityId: res.insertId, after: { name: clean } });
    return { department: (await getDepartment(res.insertId))!, existed: false };
  } catch (err) {
    if (isDuplicateKey(err)) {
      const d = await findSimilarDepartment(clean);
      if (d) return { department: d, existed: true };
    }
    throw err;
  }
}

export async function setMembership(calendarId: number, userId: number, departmentId: number): Promise<void> {
  const existing = await db.queryOne<{ department_id: number }>("SELECT department_id FROM memberships WHERE calendar_id = ? AND user_id = ?", [
    calendarId,
    userId,
  ]);
  if (existing) {
    await db.execute("UPDATE memberships SET department_id = ? WHERE calendar_id = ? AND user_id = ?", [departmentId, calendarId, userId]);
    return;
  }
  try {
    await db.execute("INSERT INTO memberships (calendar_id, user_id, department_id, joined_at) VALUES (?, ?, ?, ?)", [calendarId, userId, departmentId, new Date()]);
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    await db.execute("UPDATE memberships SET department_id = ? WHERE calendar_id = ? AND user_id = ?", [departmentId, calendarId, userId]);
  }
}

/** Moves every membership from `fromId` to `intoId` and archives `fromId`. */
export async function mergeDepartments(fromId: number, intoId: number, actorId: number): Promise<number> {
  return transaction(async (tx) => {
    const res = await tx.execute("UPDATE memberships SET department_id = ? WHERE department_id = ?", [intoId, fromId]);
    await tx.execute("UPDATE departments SET status = 'archived', merged_into_id = ? WHERE id = ? AND org_id = ?", [intoId, fromId, env.orgId]);
    await logAudit({ userId: actorId, action: "department.merge", entity: "department", entityId: fromId, after: { mergedInto: intoId, movedMemberships: res.affectedRows } }, tx);
    return res.affectedRows;
  });
}
