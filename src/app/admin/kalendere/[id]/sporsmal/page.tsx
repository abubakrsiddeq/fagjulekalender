import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { requireCalendar } from "@/lib/admin";
import { doorDate } from "@/lib/calendar";
import { answerCounts, isDoorLocked, listQuestions } from "@/lib/questions";
import { formatDate, formatDayMonthShort } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { updateSourceRevision } from "../../../actions";
import { CalendarAdminNav } from "../../../_components/CalendarAdminNav";
import { ImportForm } from "../../../_components/ImportForm";

export const metadata = { title: "Spørsmål" };

export default function QuestionsPage(props: PageProps<"/admin/kalendere/[id]/sporsmal">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/admin/kalendere/[id]/sporsmal">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/kalendere/${id}/sporsmal`);
  const cal = await requireCalendar(id);
  if (!cal) notFound();
  const [questions, counts] = await Promise.all([listQuestions(cal.id), answerCounts(cal.id)]);
  const byDoor = new Map(questions.map((q) => [q.door_number, q]));

  // Source routines used in this calendar, for the revision reminder.
  const sources = new Map<string, { title: string; doors: number[]; revision: string | null }>();
  for (const q of questions) {
    if (!q.source_eqs_id) continue;
    const s = sources.get(q.source_eqs_id) ?? { title: q.source_title ?? "", doors: [], revision: null };
    s.doors.push(q.door_number);
    if (q.source_revision_date && (!s.revision || q.source_revision_date > s.revision)) s.revision = q.source_revision_date;
    sources.set(q.source_eqs_id, s);
  }

  return (
    <>
      <CalendarAdminNav id={cal.id} name={cal.name} active="questions" />
      <div className="panel-head">
        <h1>Spørsmål</h1>
        <a className="btn ghost small" href={`/api/admin/kalendere/${cal.id}/eksport/sporsmal`}>
          Eksporter CSV
        </a>
      </div>

      <section className="panel tbl" aria-label="Spørsmål per luke">
        <table>
          <thead>
            <tr>
              <th scope="col">Luke</th>
              <th scope="col">Tema</th>
              <th scope="col">Spørsmål</th>
              <th scope="col">Kilde</th>
              <th scope="col">Godkjenning</th>
              <th scope="col" className="num">
                Svar
              </th>
              <th scope="col">
                <span className="sr-only">Handlinger</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: cal.door_count }, (_, i) => i + 1).map((door) => {
              const q = byDoor.get(door);
              const n = q ? counts.get(q.id) ?? 0 : 0;
              const revised = q?.source_revision_date && q.approved_at && q.source_revision_date > q.approved_at;
              return (
                <tr key={door}>
                  <td>
                    <b>{door}</b>
                    <div className="small">{formatDayMonthShort(doorDate(cal, door))}</div>
                  </td>
                  <td>{q?.topic ?? "–"}</td>
                  <td style={{ minWidth: 220 }}>
                    {q ? (q.text.length > 90 ? q.text.slice(0, 90) + "…" : q.text) : <span className="badge bad">Mangler spørsmål</span>}
                    {q && isDoorLocked(cal, door, n > 0) && (
                      <div>
                        <span className="badge">Åpnet</span>
                      </div>
                    )}
                  </td>
                  <td className="small">{q?.source_eqs_id ? `EQS ${q.source_eqs_id}` : q ? <span className="badge warn">Mangler kilde</span> : ""}</td>
                  <td className="small">
                    {q?.approved_at ? (
                      <>
                        <span className="badge ok">Godkjent</span>
                        <div>
                          {q.approved_by} {formatDate(q.approved_at)}
                        </div>
                      </>
                    ) : q ? (
                      <span className="badge warn">Ikke godkjent</span>
                    ) : null}
                    {revised && (
                      <div>
                        <span className="badge bad">Kilden er revidert – sjekk</span>
                      </div>
                    )}
                  </td>
                  <td className="num">{n}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <Link href={`/admin/kalendere/${cal.id}/sporsmal/${door}`}>{q ? "Rediger" : "Legg til"}</Link>
                    {q && (
                      <>
                        {" · "}
                        <Link href={`/admin/kalendere/${cal.id}/forhandsvisning/${door}`}>Vis</Link>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel" aria-labelledby="import-h">
        <h2 id="import-h">Importer spørsmål</h2>
        <ImportForm calendarId={cal.id} />
      </section>

      <section className="panel" aria-labelledby="src-h">
        <h2 id="src-h">Kilderutiner</h2>
        <p className="small">
          Når en rutine i EQS får ny revisjon: legg inn revisjonsdatoen her. Spørsmål som ble godkjent før denne datoen blir merket «Kilden er revidert».
        </p>
        {sources.size === 0 ? (
          <p className="empty">Ingen spørsmål har EQS-ID ennå.</p>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th scope="col">Rutine</th>
                  <th scope="col">Luker</th>
                  <th scope="col">Revisjonsdato</th>
                  <th scope="col">Ny revisjon</th>
                </tr>
              </thead>
              <tbody>
                {[...sources.entries()].map(([eqs, s]) => (
                  <tr key={eqs}>
                    <td>
                      {s.title}
                      <div className="small">EQS {eqs}</div>
                    </td>
                    <td className="small">{s.doors.join(", ")}</td>
                    <td>{formatDate(s.revision)}</td>
                    <td>
                      <form action={updateSourceRevision} className="inline-form">
                        <input type="hidden" name="calendar_id" value={cal.id} />
                        <input type="hidden" name="eqs_id" value={eqs} />
                        <label className="sr-only" htmlFor={`rev-${eqs}`}>
                          Ny revisjonsdato for EQS {eqs}
                        </label>
                        <input id={`rev-${eqs}`} type="date" name="revision_date" required />
                        <button className="btn ghost small" type="submit">
                          Lagre
                        </button>
                      </form>
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
