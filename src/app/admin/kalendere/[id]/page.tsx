import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { calendarStats, calendarToInput, countAnswers, requireCalendar } from "@/lib/admin";
import { listDepartments } from "@/lib/departments";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { allowedDomains, getOrg } from "@/lib/org";
import { doorOpensAt } from "@/lib/calendar";
import { formatDateTime } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { setCalendarStatus } from "../../actions";
import { CalendarAdminNav } from "../../_components/CalendarAdminNav";
import { CalendarForm } from "../../_components/CalendarForm";
import { CopyForm } from "../../_components/CopyForm";

export const metadata = { title: "Kalender" };

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

  const [stats, answers, departments, org, invites] = await Promise.all([
    calendarStats([cal.id]).then((m) => m.get(cal.id)!),
    countAnswers(cal.id),
    listDepartments(["active"]),
    getOrg(),
    db.queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM invites WHERE org_id = ?", [env.orgId]),
  ]);
  const domains = allowedDomains(org);
  const link = `${env.appUrl}/kalender/${cal.slug}`;
  const checks = [
    { ok: stats.questions === cal.door_count, text: `${stats.questions} av ${cal.door_count} luker har spørsmål`, href: `/admin/kalendere/${cal.id}/sporsmal` },
    { ok: stats.approved === cal.door_count, text: `${stats.approved} av ${cal.door_count} spørsmål er godkjent av fagperson`, href: `/admin/kalendere/${cal.id}/sporsmal` },
    { ok: departments.length > 0, text: `${departments.length} aktive avdelinger`, href: "/admin/avdelinger" },
    {
      ok: domains.length > 0 || Number(invites?.n ?? 0) > 0,
      text:
        domains.length || Number(invites?.n ?? 0)
          ? `Pålogging tillatt for ${[domains.map((d) => "@" + d).join(", "), invites?.n ? `${invites.n} inviterte` : ""].filter(Boolean).join(" og ")}`
          : "Ingen domene- eller invitasjonsregel: alle kan logge inn",
      href: "/admin/brukere",
    },
  ];

  return (
    <>
      <CalendarAdminNav id={cal.id} name={cal.name} active="overview" />
      <div className="panel-head">
        <h1>{cal.name}</h1>
        <span className={`badge ${cal.status === "published" ? "ok" : cal.status === "draft" ? "warn" : ""}`}>
          {cal.status === "published" ? "Publisert" : cal.status === "draft" ? "Utkast" : "Arkivert"}
        </span>
      </div>

      <section className="panel" aria-labelledby="pub-h">
        <h2 id="pub-h">Klar til publisering?</h2>
        <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 6 }}>
          {checks.map((c) => (
            <li key={c.text}>
              <span className={`badge ${c.ok ? "ok" : "warn"}`}>{c.ok ? "OK" : "Sjekk"}</span> <Link href={c.href}>{c.text}</Link>
            </li>
          ))}
        </ul>
        <p className="small">
          Luke 1 åpner {formatDateTime(doorOpensAt(cal, 1), cal.timezone)} · stenger {formatDateTime(cal.closes_at, cal.timezone)} ({cal.timezone}) ·{" "}
          {stats.members} deltakere · {answers} svar
        </p>
        <div className="field">
          <label htmlFor="share">Lenke til deltakerne</label>
          <input id="share" type="text" readOnly value={link} />
        </div>
        <div className="row">
          {cal.status !== "published" && (
            <form action={setCalendarStatus}>
              <input type="hidden" name="calendar_id" value={cal.id} />
              <input type="hidden" name="status" value="published" />
              <button className="btn" type="submit">
                Publiser
              </button>
            </form>
          )}
          {cal.status === "published" && (
            <form action={setCalendarStatus}>
              <input type="hidden" name="calendar_id" value={cal.id} />
              <input type="hidden" name="status" value="draft" />
              <button className="btn ghost" type="submit">
                Sett tilbake til utkast
              </button>
            </form>
          )}
          {cal.status !== "archived" && (
            <form action={setCalendarStatus}>
              <input type="hidden" name="calendar_id" value={cal.id} />
              <input type="hidden" name="status" value="archived" />
              <button className="btn ghost" type="submit">
                Arkiver
              </button>
            </form>
          )}
          <Link className="btn ghost" href={`/kalender/${cal.slug}`}>
            Åpne som deltaker
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="settings-h">
        <h2 id="settings-h">Innstillinger</h2>
        <CalendarForm calendarId={cal.id} initial={calendarToInput(cal)} scheduleLocked={answers > 0} />
      </section>

      <section className="panel" aria-labelledby="copy-h">
        <h2 id="copy-h">Kopier til nytt år</h2>
        <CopyForm calendarId={cal.id} year={cal.year} />
      </section>
    </>
  );
}
