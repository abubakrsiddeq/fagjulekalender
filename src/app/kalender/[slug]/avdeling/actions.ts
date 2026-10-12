"use server";

import { redirect } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { canChangeDepartment, getCalendarBySlug, getMembership } from "@/lib/calendar";
import { canSeeCalendar } from "@/lib/context";
import { db } from "@/lib/db";
import { getDepartment, proposeDepartment, setMembership } from "@/lib/departments";
import { invalidateScoreboard } from "@/lib/leaderboard";
import { getOrg } from "@/lib/org";
import { t } from "@/i18n";

export interface JoinState {
  ok?: boolean;
  error?: string;
}

export async function joinDepartment(slug: string, _prev: JoinState, formData: FormData): Promise<JoinState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/logg-inn?neste=${encodeURIComponent(`/kalender/${slug}/avdeling`)}`);
  const cal = await getCalendarBySlug(slug);
  if (!cal || !canSeeCalendar(cal, user) || cal.status === "archived") return { error: t.common.error };

  const current = await getMembership(cal.id, user.id);
  if (current && !canChangeDepartment(cal, new Date()) && user.role !== "admin") return { error: t.department.locked };

  const proposal = String(formData.get("proposal") ?? "").trim();
  const org = await getOrg();
  let departmentId: number;
  if (proposal && org.allow_department_proposals) {
    const res = await proposeDepartment(proposal, user.id);
    if ("error" in res) return { error: res.error };
    departmentId = res.department.id;
  } else {
    departmentId = Number(formData.get("department"));
    const dept = Number.isInteger(departmentId) ? await getDepartment(departmentId) : null;
    // Active departments, or the pending one the participant already proposed/joined.
    const ok = dept && (dept.status === "active" || (dept.status === "pending" && (dept.proposed_by === user.id || current?.department_id === dept.id)));
    if (!ok) return { error: t.department.required };
  }

  await setMembership(cal.id, user.id, departmentId);
  await db.execute("UPDATE users SET department_id = ?, notify_daily = ? WHERE id = ?", [departmentId, formData.get("notify") === "on" ? 1 : 0, user.id]);
  invalidateScoreboard(cal.id);
  if (formData.get("inline") === "1") {
    // Picked on the calendar page itself: re-render it in place.
    refresh();
    return { ok: true };
  }
  revalidatePath(`/kalender/${slug}`, "layout");
  redirect(`/kalender/${slug}`);
}
