import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { calendarStats, calendarToInput, countAnswers, requireCalendar } from "@/lib/admin";
import { listDepartments } from "@/lib/departments";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { allowedDomains, getOrg } from "@/lib/org";
import { doorOpensAt } from "@/lib/calendar";
import { formatDateTime } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { getT } from "@/i18n/server";
import { setCalendarStatus } from "../../actions";
import { CalendarAdminNav } from "../../_components/CalendarAdminNav";
import { CalendarForm } from "../../_components/CalendarForm";
import { CopyForm } from "../../_components/CopyForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.overview.title };
}

export default function CalendarAdminPage(props: PageProps<"/admin/kalendere/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/admin/kalendere/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/kalendere/${id}`);
  const cal = await requireCalendar(id);
  if (!cal) notFound();
  const a = (await getT()).admin;
  const o = a.overview;

  const [stats, answers, departments, org, invites] = await Promise.all([
    calendarStats([cal.id]).then((m) => m.get(cal.id)!),
    countAnswers(cal.id),
    listDepartments(["active"]),
    getOrg(),
    db.queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM invites WHERE org_id = ?", [env.orgId]),
  ]);
  const domains = allowedDomains(org);
  const inviteCount = Number(invites?.n ?? 0);
  const link = `${env.appUrl}/kalender/${cal.slug}`;
  const checks = [
    { ok: stats.questions === cal.door_count, text: o.questions(stats.questions, cal.door_count), href: `/admin/kalendere/${cal.id}/sporsmal` },
    { ok: stats.approved === cal.door_count, text: o.approved(stats.approved, cal.door_count), href: `/admin/kalendere/${cal.id}/sporsmal` },
    { ok: departments.length > 0, text: o.departments(departments.length), href: "/admin/avdelinger" },
    {
      // Open sign-up is the default; this line only states the current rule.
      ok: true,
      text:
        domains.length || inviteCount
          ? o.signupFor([domains.map((d) => "@" + d).join(", "), inviteCount ? o.invited(inviteCount) : ""].filter(Boolean).join(o.and))
          : o.signupOpen,
      href: "/admin/brukere",
    },
  ];

  return (
    <>
      <CalendarAdminNav id={cal.id} name={cal.name} active="overview" />
      <div className="panel-head">
        <h1>{cal.name}</h1>
        <span className={`badge ${cal.status === "published" ? "ok" : cal.status === "draft" ? "warn" : ""}`}>{a.status[cal.status]}</span>
      </div>

      <section className="panel" aria-labelledby="pub-h">
        <h2 id="pub-h">{o.readyTitle}</h2>
        <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 6 }}>
          {checks.map((c) => (
            <li key={c.text}>
              <span className={`badge ${c.ok ? "ok" : "warn"}`}>{c.ok ? o.ok : o.check}</span> <Link href={c.href}>{c.text}</Link>
            </li>
          ))}
        </ul>
        <p className="small">
          {o.schedule(formatDateTime(doorOpensAt(cal, 1), cal.timezone), formatDateTime(cal.closes_at, cal.timezone), cal.timezone, stats.members, answers)}
        </p>
        <div className="field">
          <label htmlFor="share">{o.shareLink}</label>
          <input id="share" type="text" readOnly value={link} />
        </div>
        <div className="row">
          {cal.status !== "published" && (
            <form action={setCalendarStatus}>
              <input type="hidden" name="calendar_id" value={cal.id} />
              <input type="hidden" name="status" value="published" />
              <button className="btn" type="submit">
                {o.publish}
              </button>
            </form>
          )}
          {cal.status === "published" && (
            <form action={setCalendarStatus}>
              <input type="hidden" name="calendar_id" value={cal.id} />
              <input type="hidden" name="status" value="draft" />
              <button className="btn ghost" type="submit">
                {o.toDraft}
              </button>
            </form>
          )}
          {cal.status !== "archived" && (
            <form action={setCalendarStatus}>
              <input type="hidden" name="calendar_id" value={cal.id} />
              <input type="hidden" name="status" value="archived" />
              <button className="btn ghost" type="submit">
                {o.archive}
              </button>
            </form>
          )}
          <Link className="btn ghost" href={`/kalender/${cal.slug}`}>
            {o.openAsParticipant}
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="settings-h">
        <h2 id="settings-h">{o.settings}</h2>
        <CalendarForm calendarId={cal.id} initial={calendarToInput(cal)} scheduleLocked={answers > 0} />
      </section>

      <section className="panel" aria-labelledby="copy-h">
        <h2 id="copy-h">{o.copyTitle}</h2>
        <CopyForm calendarId={cal.id} year={cal.year} />
      </section>
    </>
  );
}
