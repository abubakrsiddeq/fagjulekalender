import { canChangeDepartment, type MembershipInfo } from "@/lib/calendar";
import { getDepartment, listDepartments } from "@/lib/departments";
import { getOrg } from "@/lib/org";
import type { Calendar, User } from "@/lib/types";
import { DepartmentForm } from "./DepartmentForm";
import { t } from "@/i18n";

/**
 * Department choice, used inline on the calendar page (first visit) and on /avdeling (change).
 * Inline use avoids a server redirect from the calendar page: the client router would cache
 * that redirect and replay it after the participant has joined.
 */
export async function DepartmentPicker({
  slug,
  cal,
  user,
  membership,
  inline,
}: {
  slug: string;
  cal: Calendar;
  user: User;
  membership: MembershipInfo | null;
  inline: boolean;
}) {
  const org = await getOrg();
  const locked = !!membership && !canChangeDepartment(cal, new Date()) && user.role !== "admin";
  if (locked) {
    return (
      <>
        <p>
          {t.calendar.competingFor} <b>{membership!.department_name}</b>.
        </p>
        <p className="note">{t.department.locked}</p>
      </>
    );
  }
  const departments = (await listDepartments(["active"])).map((d) => ({ id: d.id, name: d.name, pending: false }));
  if (membership?.department_status === "pending") {
    const d = await getDepartment(membership.department_id);
    if (d) departments.push({ id: d.id, name: d.name, pending: true });
  }
  return (
    <DepartmentForm
      slug={slug}
      departments={departments}
      currentId={membership?.department_id ?? null}
      notify={!!user.notify_daily}
      allowProposals={!!org.allow_department_proposals}
      inline={inline}
    />
  );
}
