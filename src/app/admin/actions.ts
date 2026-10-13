"use server";

import { redirect } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db, transaction } from "@/lib/db";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/audit";
import {
  copyCalendar as copyCalendarLib,
  createCalendar as createCalendarLib,
  parseCalendarForm,
  requireCalendar,
  setCalendarStatus as setCalendarStatusLib,
  updateCalendar as updateCalendarLib,
} from "@/lib/admin";
import { cleanName, findSimilarDepartment, getDepartment, mergeDepartments, nameKey, listDepartments } from "@/lib/departments";
import { invalidateScoreboard } from "@/lib/leaderboard";
import { invalidateOrg } from "@/lib/org";
import { deleteQuestion, importQuestionsCsv, saveQuestion, type ImportReport, type QuestionInput } from "@/lib/questions";
import { isValidEmail, normalizeEmail } from "@/lib/login";
import type { Role } from "@/lib/types";
import { getT } from "@/i18n/server";

export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: string[];
  needsConfirm?: boolean;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ---------------------------------------------------------------------------
// Calendars
// ---------------------------------------------------------------------------

export async function createCalendar(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const res = await createCalendarLib(parseCalendarForm(fd), admin.id);
  if ("errors" in res) return { errors: res.errors };
  revalidatePath("/admin", "layout");
  redirect(`/admin/kalendere/${res.id}`);
}

export async function updateCalendar(calendarId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = await getT();
  const m = t.admin.msg;
  const cal = await requireCalendar(calendarId);
  if (!cal) return { errors: [m.calendarNotFound] };
  const res = await updateCalendarLib(cal, parseCalendarForm(fd), admin.id);
  if ("errors" in res) return { errors: res.errors };
  invalidateScoreboard(cal.id);
  refresh();
  return { ok: true, message: m.settingsSaved };
}

export async function setCalendarStatus(fd: FormData) {
  const admin = await requireAdmin();
  const cal = await requireCalendar(str(fd, "calendar_id"));
  const status = str(fd, "status");
  if (!cal || !["draft", "published", "archived"].includes(status)) return;
  await setCalendarStatusLib(cal, status as "draft" | "published" | "archived", admin.id);
  refresh();
}

export async function copyCalendar(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = await getT();
  const m = t.admin.msg;
  const cal = await requireCalendar(str(fd, "calendar_id"));
  if (!cal) return { errors: [m.calendarNotFound] };
  const res = await copyCalendarLib(cal, Number(str(fd, "year")), str(fd, "slug").toLowerCase(), admin.id);
  if ("errors" in res) return { errors: res.errors };
  revalidatePath("/admin", "layout");
  redirect(`/admin/kalendere/${res.id}`);
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

function parseQuestionForm(fd: FormData): QuestionInput {
  const correct = str(fd, "correct");
  const options: QuestionInput["options"] = [];
  for (let i = 0; i < 6; i++) {
    const id = str(fd, `option_id_${i}`);
    options.push({ id: id ? Number(id) : null, text: str(fd, `option_text_${i}`), isCorrect: correct === String(i) });
  }
  return {
    door: Number(str(fd, "door")),
    topic: str(fd, "topic"),
    text: str(fd, "text"),
    imageUrl: str(fd, "image_url") || null,
    explanation: str(fd, "explanation"),
    sourceTitle: str(fd, "source_title") || null,
    sourceEqsId: str(fd, "source_eqs_id") || null,
    sourceRevisionDate: str(fd, "source_revision_date") || null,
    approvedBy: str(fd, "approved_by") || null,
    approvedAt: str(fd, "approved_at") || null,
    options,
  };
}

export async function saveQuestionAction(calendarId: number, existingDoor: number | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = await getT();
  const m = t.admin.msg;
  const cal = await requireCalendar(calendarId);
  if (!cal) return { errors: [m.calendarNotFound] };
  const res = await saveQuestion(cal, parseQuestionForm(fd), existingDoor, admin.id, {
    confirmed: fd.get("confirm_open") === "on",
    reason: str(fd, "reason"),
  });
  if (!res.ok) return { errors: res.errors, needsConfirm: res.needsConfirm };
  if (existingDoor !== res.door) {
    revalidatePath(`/admin/kalendere/${cal.id}`, "layout");
    redirect(`/admin/kalendere/${cal.id}/sporsmal/${res.door}?lagret=1`);
  }
  refresh();
  return { ok: true, message: t.admin.questions.saved };
}

export async function deleteQuestionAction(fd: FormData) {
  const admin = await requireAdmin();
  const cal = await requireCalendar(str(fd, "calendar_id"));
  if (!cal) return;
  const err = await deleteQuestion(cal, Number(str(fd, "door")), admin.id);
  revalidatePath(`/admin/kalendere/${cal.id}`, "layout");
  if (err) redirect(`/admin/kalendere/${cal.id}/sporsmal/${str(fd, "door")}?feil=${encodeURIComponent(err)}`);
  redirect(`/admin/kalendere/${cal.id}/sporsmal`);
}

export interface ImportState {
  report?: ImportReport;
  error?: string;
}

export async function importQuestionsAction(calendarId: number, _prev: ImportState, fd: FormData): Promise<ImportState> {
  const admin = await requireAdmin();
  const t = await getT();
  const m = t.admin.msg;
  const cal = await requireCalendar(calendarId);
  if (!cal) return { error: m.calendarNotFound };
  const file = fd.get("file");
  let text = str(fd, "csv_text");
  if (file instanceof File && file.size > 0) {
    if (file.size > 1_500_000) return { error: m.fileTooLarge };
    if (/\.xlsx?$/i.test(file.name)) return { error: m.saveAsCsv };
    text = await file.text();
  }
  if (!text) return { error: m.chooseFile };
  const report = await importQuestionsCsv(cal, text, admin.id, fd.get("overwrite_opened") === "on");
  refresh();
  return { report };
}

/** Records a new revision date for a source routine; questions approved before it get flagged. */
export async function updateSourceRevision(fd: FormData) {
  const admin = await requireAdmin();
  const cal = await requireCalendar(str(fd, "calendar_id"));
  const eqs = str(fd, "eqs_id");
  const date = str(fd, "revision_date");
  if (!cal || !eqs || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const res = await db.execute("UPDATE questions SET source_revision_date = ? WHERE calendar_id = ? AND source_eqs_id = ?", [date, cal.id, eqs]);
  await logAudit({ userId: admin.id, action: "source.revision", entity: "calendar", entityId: cal.id, after: { eqs, date, questions: res.affectedRows } });
  refresh();
}

// ---------------------------------------------------------------------------
// Participants: move department, reset answers
// ---------------------------------------------------------------------------

export async function moveParticipant(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = await getT();
  const m = t.admin.msg;
  const cal = await requireCalendar(str(fd, "calendar_id"));
  const userId = Number(str(fd, "user_id"));
  const deptId = Number(str(fd, "department_id"));
  const reason = str(fd, "reason");
  if (!cal) return { errors: [m.calendarNotFound] };
  if (!reason) return { errors: [m.moveReasonRequired] };
  const dept = await getDepartment(deptId);
  if (!dept || dept.status === "archived") return { errors: [m.chooseActiveDepartment] };
  const before = await db.queryOne<{ department_id: number }>("SELECT department_id FROM memberships WHERE calendar_id = ? AND user_id = ?", [cal.id, userId]);
  if (!before) {
    await db.execute("INSERT INTO memberships (calendar_id, user_id, department_id, joined_at) VALUES (?, ?, ?, ?)", [cal.id, userId, deptId, new Date()]);
  } else {
    await db.execute("UPDATE memberships SET department_id = ? WHERE calendar_id = ? AND user_id = ?", [deptId, cal.id, userId]);
  }
  await db.execute("UPDATE users SET department_id = ? WHERE id = ? AND org_id = ?", [deptId, userId, env.orgId]);
  await logAudit({
    userId: admin.id,
    action: "membership.move",
    entity: "membership",
    entityId: `${cal.id}:${userId}`,
    before: before ?? undefined,
    after: { department_id: deptId },
    reason,
  });
  invalidateScoreboard(cal.id);
  refresh();
  return { ok: true, message: m.moved(dept.name) };
}

export async function resetAnswer(fd: FormData) {
  const admin = await requireAdmin();
  const t = await getT();
  const m = t.admin.msg;
  const cal = await requireCalendar(str(fd, "calendar_id"));
  const answerId = Number(str(fd, "answer_id"));
  const reason = str(fd, "reason") || m.resetDefaultReason;
  if (!cal) return;
  await transaction(async (tx) => {
    const before = await tx.queryOne<Record<string, unknown>>("SELECT * FROM answers WHERE id = ? AND calendar_id = ?", [answerId, cal.id]);
    if (!before) return;
    await tx.execute("DELETE FROM answers WHERE id = ?", [answerId]);
    await logAudit({ userId: admin.id, action: "answer.reset", entity: "answer", entityId: answerId, before, reason }, tx);
  });
  invalidateScoreboard(cal.id);
  refresh();
}

// ---------------------------------------------------------------------------
// Departments (FR-2.2, FR-2.3)
// ---------------------------------------------------------------------------

export async function addDepartment(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = await getT();
  const m = t.admin.msg;
  const names = str(fd, "names")
    .split(/\r?\n/)
    .map(cleanName)
    .filter((n) => n.length >= 2);
  if (!names.length) return { errors: [m.namesRequired] };
  const added: string[] = [];
  const skipped: string[] = [];
  for (const name of names) {
    const similar = await findSimilarDepartment(name);
    if (similar) {
      skipped.push(m.existsAs(name, similar.name));
      continue;
    }
    const res = await db.execute("INSERT INTO departments (org_id, name, status, created_at) VALUES (?, ?, 'active', ?)", [env.orgId, name, new Date()]);
    await logAudit({ userId: admin.id, action: "department.create", entity: "department", entityId: res.insertId, after: { name } });
    added.push(name);
  }
  refresh();
  return {
    ok: added.length > 0,
    message: added.length ? m.added(added.join(", ")) : undefined,
    errors: skipped.length ? [`${m.skipped(skipped.join("; "))}`] : undefined,
  };
}

export async function renameDepartment(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = await getT();
  const m = t.admin.msg;
  const dept = await getDepartment(Number(str(fd, "department_id")));
  const name = cleanName(str(fd, "name"));
  if (!dept) return { errors: [m.departmentNotFound] };
  if (name.length < 2) return { errors: [m.nameTooShort] };
  const all = await listDepartments(["active", "pending", "archived"]);
  const clash = all.find((d) => d.id !== dept.id && nameKey(d.name) === nameKey(name));
  if (clash) return { errors: [m.nameClash(clash.name)] };
  await db.execute("UPDATE departments SET name = ? WHERE id = ?", [name, dept.id]);
  await logAudit({ userId: admin.id, action: "department.rename", entity: "department", entityId: dept.id, before: { name: dept.name }, after: { name } });
  refresh();
  return { ok: true, message: m.saved };
}

export async function setDepartmentStatus(fd: FormData) {
  const admin = await requireAdmin();
  const dept = await getDepartment(Number(str(fd, "department_id")));
  const status = str(fd, "status");
  if (!dept || !["active", "archived"].includes(status)) return;
  await db.execute("UPDATE departments SET status = ? WHERE id = ?", [status, dept.id]);
  await logAudit({ userId: admin.id, action: "department.status", entity: "department", entityId: dept.id, before: { status: dept.status }, after: { status } });
  await invalidateAllScoreboards();
  refresh();
}

export async function mergeDepartmentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = await getT();
  const m = t.admin.msg;
  const from = await getDepartment(Number(str(fd, "from_id")));
  const into = await getDepartment(Number(str(fd, "into_id")));
  if (!from || !into || from.id === into.id) return { errors: [m.chooseTwo] };
  if (into.status !== "active") return { errors: [m.intoMustBeActive] };
  const moved = await mergeDepartments(from.id, into.id, admin.id);
  await invalidateAllScoreboards();
  refresh();
  return { ok: true, message: m.merged(from.name, into.name, moved) };
}

async function invalidateAllScoreboards() {
  const cals = await db.query<{ id: number }>("SELECT id FROM calendars WHERE org_id = ?", [env.orgId]);
  for (const c of cals) invalidateScoreboard(c.id);
}

// ---------------------------------------------------------------------------
// Users and invites (FR-1.3)
// ---------------------------------------------------------------------------

export async function setUserRole(fd: FormData) {
  const admin = await requireAdmin();
  const userId = Number(str(fd, "user_id"));
  const role = str(fd, "role") as Role;
  if (!["participant", "lead", "admin"].includes(role)) return;
  if (userId === admin.id && role !== "admin") return; // never lock yourself out
  const before = await db.queryOne<{ role: Role }>("SELECT role FROM users WHERE id = ? AND org_id = ?", [userId, env.orgId]);
  if (!before) return;
  await db.execute("UPDATE users SET role = ? WHERE id = ? AND org_id = ?", [role, userId, env.orgId]);
  await logAudit({ userId: admin.id, action: "user.role", entity: "user", entityId: userId, before, after: { role } });
  refresh();
}

export async function anonymizeUser(fd: FormData) {
  const admin = await requireAdmin();
  const userId = Number(str(fd, "user_id"));
  if (userId === admin.id) return;
  await transaction(async (tx) => {
    await tx.execute(
      `UPDATE users SET email = CONCAT('anonymisert-', id, '@anonymisert.invalid'), display_name = 'Anonymisert', hide_name = 1,
         kommune = NULL, bydel = NULL, ressursnummer = NULL, ansvarlig = NULL,
         notify_daily = 0, role = 'participant', anonymized_at = ? WHERE id = ? AND org_id = ?`,
      [new Date(), userId, env.orgId],
    );
    await tx.execute("DELETE FROM sessions WHERE user_id = ?", [userId]);
    await logAudit({ userId: admin.id, action: "user.anonymize", entity: "user", entityId: userId }, tx);
  });
  await invalidateAllScoreboards();
  refresh();
}

export async function addInvites(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = await getT();
  const m = t.admin.msg;
  const emails = str(fd, "emails")
    .split(/[\s,;]+/)
    .map(normalizeEmail)
    .filter(Boolean);
  const valid = [...new Set(emails.filter(isValidEmail))];
  const invalid = emails.filter((e) => !isValidEmail(e));
  if (!valid.length) return { errors: [m.noValidEmails] };
  const now = new Date();
  await db.execute("INSERT IGNORE INTO invites (org_id, email, created_at) VALUES ?", [valid.map((e) => [env.orgId, e, now])]);
  await logAudit({ userId: admin.id, action: "invite.add", entity: "invite", after: { count: valid.length } });
  refresh();
  return { ok: true, message: m.invitesAdded(valid.length), errors: invalid.length ? [m.invalidEmails(invalid.join(", "))] : undefined };
}

export async function removeInvite(fd: FormData) {
  const admin = await requireAdmin();
  const email = normalizeEmail(str(fd, "email"));
  await db.execute("DELETE FROM invites WHERE org_id = ? AND email = ?", [env.orgId, email]);
  await logAudit({ userId: admin.id, action: "invite.remove", entity: "invite", entityId: email });
  refresh();
}

// ---------------------------------------------------------------------------
// Organization settings
// ---------------------------------------------------------------------------

export async function saveSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = await getT();
  const m = t.admin.msg;
  const name = str(fd, "name").slice(0, 200);
  const domains = str(fd, "allowed_email_domains")
    .split(/[\s,;]+/)
    .map((d) => d.toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  const brand = str(fd, "brand_color");
  const logo = str(fd, "logo_url");
  const errors: string[] = [];
  if (!name) errors.push(m.orgNameRequired);
  if (domains.some((d) => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))) errors.push(m.invalidDomain);
  if (brand && !/^#[0-9a-fA-F]{6}$/.test(brand)) errors.push(m.invalidColor);
  if (logo && !/^https:\/\/\S+$/.test(logo)) errors.push(m.invalidLogo);
  if (errors.length) return { errors };
  const before = await db.queryOne("SELECT name, allowed_email_domains, allow_department_proposals, brand_color, logo_url FROM organizations WHERE id = ?", [env.orgId]);
  const after = {
    name,
    allowed_email_domains: domains.join(",") || null,
    allow_department_proposals: fd.get("allow_department_proposals") === "on" ? 1 : 0,
    brand_color: brand || null,
    logo_url: logo || null,
  };
  await db.execute(
    "UPDATE organizations SET name = ?, allowed_email_domains = ?, allow_department_proposals = ?, brand_color = ?, logo_url = ? WHERE id = ?",
    [after.name, after.allowed_email_domains, after.allow_department_proposals, after.brand_color, after.logo_url, env.orgId],
  );
  await logAudit({ userId: admin.id, action: "org.update", entity: "organization", entityId: env.orgId, before, after });
  invalidateOrg();
  refresh();
  return { ok: true, message: m.settingsSaved };
}
