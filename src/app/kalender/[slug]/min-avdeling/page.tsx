import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { loadCalendarPage } from "@/lib/context";
import { getScoreboard } from "@/lib/leaderboard";
import { formatDateTime } from "@/lib/time";
import { CalendarNav } from "@/components/CalendarNav";
import { Loading } from "@/components/Loading";
import { ScrollTable } from "@/components/ScrollTable";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.lead.title };
}

export default function LeadPage(props: PageProps<"/kalender/[slug]/min-avdeling">) {
  return (
    <div className="wrap">
      <Suspense fallback={<Loading />}>
        <LeadContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function LeadContent({ params }: { params: PageProps<"/kalender/[slug]/min-avdeling">["params"] }) {
  const { slug } = await params;
  const { user, cal, membership } = await loadCalendarPage(slug, `/kalender/${slug}/min-avdeling`);
  const t = await getT();
  if (user.role !== "lead" && user.role !== "admin") redirect(`/kalender/${slug}`);
  if (!membership) {
    return <p className="note">{t.lead.noDepartment}</p>;
  }
  const board = await getScoreboard(cal, { fresh: true });
  const members = board.participants
    .filter((p) => p.departmentId === membership.department_id)
    .sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName, "nb"));

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">{cal.name}</span>
        <h1>
          {t.lead.title}: {membership.department_name}
        </h1>
        <p>{t.lead.intro}</p>
      </header>
      <CalendarNav slug={slug} active="lead" showLead />
      <section className="panel">
        <div className="panel-head">
          <h2>
            {t.lead.members(members.length)}
          </h2>
          <a className="btn ghost small" href={`/api/kalender/${slug}/min-avdeling/eksport`}>
            {t.lead.export}
          </a>
        </div>
        {members.length === 0 ? (
          <p className="empty">{t.lead.none}</p>
        ) : (
          <ScrollTable label={t.lead.title}>
            <table>
              <thead>
                <tr>
                  <th scope="col">{t.lead.member}</th>
                  <th scope="col">{t.lead.email}</th>
                  <th scope="col">{t.registration.ressursnummer}</th>
                  <th scope="col" className="num">
                    {t.lead.answered}
                  </th>
                  <th scope="col" className="num">
                    {t.lead.correct}
                  </th>
                  <th scope="col" className="num">
                    {t.lead.points}
                  </th>
                  <th scope="col">{t.lead.last}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId}>
                    <td>{m.displayName}</td>
                    <td className="small">{m.email}</td>
                    <td className="small">{m.ressursnummer ?? "–"}</td>
                    <td className="num">
                      {m.answered}/{cal.door_count}
                    </td>
                    <td className="num">{m.correct}</td>
                    <td className="num">{m.points}</td>
                    <td className="small">{formatDateTime(m.lastAnswerAt, cal.timezone)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollTable>
        )}
      </section>
    </>
  );
}
