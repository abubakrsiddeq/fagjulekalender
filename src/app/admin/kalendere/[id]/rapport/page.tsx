import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { participationReport, requireCalendar } from "@/lib/admin";
import { getScoreboard } from "@/lib/leaderboard";
import { formatDate } from "@/lib/time";
import { DepartmentTable } from "@/components/Leaderboards";
import { Loading } from "@/components/Loading";
import { CalendarAdminNav } from "../../../_components/CalendarAdminNav";

export const metadata = { title: "Rapport og eksport" };

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
  const [report, board] = await Promise.all([participationReport(cal), getScoreboard(cal, { fresh: true })]);
  const base = `/api/admin/kalendere/${cal.id}/eksport`;

  return (
    <>
      <CalendarAdminNav id={cal.id} name={cal.name} active="report" />
      <h1>Rapport og eksport</h1>

      <section className="panel" aria-labelledby="exp-h">
        <h2 id="exp-h">Eksport (CSV for Excel)</h2>
        <div className="row">
          <a className="btn ghost small" href={`${base}/avdelinger`}>
            Resultat per avdeling
          </a>
          <a className="btn ghost small" href={`${base}/deltakere`}>
            Resultat per deltaker
          </a>
          <a className="btn ghost small" href={`${base}/svar`}>
            Alle svar
          </a>
          <a className="btn ghost small" href={`${base}/sporsmal`}>
            Spørsmål
          </a>
        </div>
        <p className="small">«Alle svar» har én rad per svar, så rangeringen kan regnes ut på nytt i Excel og sammenlignes med avdelingskampen.</p>
      </section>

      <section className="panel" aria-labelledby="rank-h">
        <h2 id="rank-h">Avdelingskampen nå</h2>
        <DepartmentTable departments={board.departments} />
      </section>

      <section className="panel" aria-labelledby="part-h">
        <h2 id="part-h">Deltakelse per avdeling og dag</h2>
        <p className="small">Antall svar som ble sendt hver dag (lokal tid). «Senere» er svar etter siste lukedato.</p>
        {report.departments.length === 0 ? (
          <p className="empty">Ingen påmeldte ennå.</p>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th scope="col">Avdeling</th>
                  <th scope="col" className="num">
                    Påmeldt
                  </th>
                  <th scope="col" className="num">
                    Aktive
                  </th>
                  <th scope="col" className="num">
                    Svar
                  </th>
                  {report.dates.map((d, i) => (
                    <th key={d} scope="col" className="num" title={formatDate(d)}>
                      {i + 1}
                    </th>
                  ))}
                  <th scope="col" className="num">
                    Senere
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.departments.map((d) => (
                  <tr key={d.id}>
                    <th scope="row" style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.92rem", color: "var(--fg)" }}>
                      {d.name}
                      {d.status !== "active" && <span className="small"> ({d.status === "pending" ? "venter" : "arkivert"})</span>}
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
        <h2 id="signup-h">Påmeldinger per dag</h2>
        {report.signups.length === 0 ? (
          <p className="empty">Ingen påmeldinger ennå.</p>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th scope="col">Dato</th>
                  <th scope="col" className="num">
                    Antall
                  </th>
                  <th scope="col">Per avdeling</th>
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
