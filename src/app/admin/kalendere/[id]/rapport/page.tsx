import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { participationReport, requireCalendar } from "@/lib/admin";
import { getScoreboard } from "@/lib/leaderboard";
import { formatDate } from "@/lib/time";
import { DepartmentTable } from "@/components/Leaderboards";
import { Loading } from "@/components/Loading";
import { getT } from "@/i18n/server";
import { CalendarAdminNav } from "../../../_components/CalendarAdminNav";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.report.title };
}

export default function ReportPage(props: PageProps<"/admin/kalendere/[id]/rapport">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/admin/kalendere/[id]/rapport">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/kalendere/${id}/rapport`);
  const cal = await requireCalendar(id);
  if (!cal) notFound();
  const a = (await getT()).admin;
  const r = a.report;
  const [report, board] = await Promise.all([participationReport(cal), getScoreboard(cal, { fresh: true })]);
  const base = `/api/admin/kalendere/${cal.id}/eksport`;

  return (
    <>
      <CalendarAdminNav id={cal.id} name={cal.name} active="report" />
      <h1>{r.title}</h1>

      <section className="panel" aria-labelledby="exp-h">
        <h2 id="exp-h">{r.exportTitle}</h2>
        <div className="row">
          <a className="btn ghost small" href={`${base}/avdelinger`}>
            {r.byDepartment}
          </a>
          <a className="btn ghost small" href={`${base}/deltakere`}>
            {r.byParticipant}
          </a>
          <a className="btn ghost small" href={`${base}/svar`}>
            {r.allAnswers}
          </a>
          <a className="btn ghost small" href={`${base}/sporsmal`}>
            {r.questions}
          </a>
        </div>
        <p className="small">{r.exportNote}</p>
      </section>

      <section className="panel" aria-labelledby="rank-h">
        <h2 id="rank-h">{r.rankingNow}</h2>
        <DepartmentTable departments={board.departments} />
      </section>

      <section className="panel" aria-labelledby="part-h">
        <h2 id="part-h">{r.participationTitle}</h2>
        <p className="small">{r.participationNote}</p>
        {report.departments.length === 0 ? (
          <p className="empty">{r.noSignups}</p>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th scope="col">{a.c.department}</th>
                  <th scope="col" className="num">
                    {r.signedUp}
                  </th>
                  <th scope="col" className="num">
                    {r.active}
                  </th>
                  <th scope="col" className="num">
                    {a.c.answers}
                  </th>
                  {report.dates.map((d, i) => (
                    <th key={d} scope="col" className="num" title={formatDate(d)}>
                      {i + 1}
                    </th>
                  ))}
                  <th scope="col" className="num">
                    {r.later}
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.departments.map((d) => (
                  <tr key={d.id}>
                    <th scope="row" style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.92rem", color: "var(--fg)" }}>
                      {d.name}
                      {d.status !== "active" && <span className="small"> ({d.status === "pending" ? a.deptStatus.pendingShort : a.deptStatus.archivedShort})</span>}
                    </th>
                    <td className="num">{d.members}</td>
                    <td className="num">{d.active}</td>
                    <td className="num">{d.answers}</td>
                    {report.dates.map((day) => (
                      <td key={day} className="num">
                        {d.perDay[day] ?? ""}
                      </td>
                    ))}
                    <td className="num">{d.later || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="signup-h">
        <h2 id="signup-h">{r.signupsTitle}</h2>
        {report.signups.length === 0 ? (
          <p className="empty">{r.noSignupsYet}</p>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th scope="col">{a.c.date}</th>
                  <th scope="col" className="num">
                    {r.count}
                  </th>
                  <th scope="col">{r.perDepartment}</th>
                </tr>
              </thead>
              <tbody>
                {report.signups.map((s) => (
                  <tr key={s.date}>
                    <td>{formatDate(s.date)}</td>
                    <td className="num">{s.total}</td>
                    <td className="small">
                      {Object.entries(s.byDepartment)
                        .map(([name, n]) => `${name}: ${n}`)
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
