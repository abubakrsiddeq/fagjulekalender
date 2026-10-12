import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { requireCalendar } from "@/lib/admin";
import { doorDate } from "@/lib/calendar";
import { listQuestions } from "@/lib/questions";
import { formatDayMonthShort } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { CalendarAdminNav } from "../../../_components/CalendarAdminNav";

export const metadata = { title: "Forhåndsvisning" };

export default function PreviewGridPage(props: PageProps<"/admin/kalendere/[id]/forhandsvisning">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/admin/kalendere/[id]/forhandsvisning">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/kalendere/${id}/forhandsvisning`);
  const cal = await requireCalendar(id);
  if (!cal) notFound();
  const questions = new Map((await listQuestions(cal.id)).map((q) => [q.door_number, q]));
  return (
    <>
      <CalendarAdminNav id={cal.id} name={cal.name} active="preview" />
      <h1>Forhåndsvisning</h1>
      <p className="muted">Alle luker kan åpnes her, uansett dato. Forhåndsvisning gir ingen poeng.</p>
      <section className="panel">
        <ol className="doors">
          {Array.from({ length: cal.door_count }, (_, i) => i + 1).map((door) => {
            const q = questions.get(door);
            return (
              <li key={door}>
                {q ? (
                  <Link className="door ready" href={`/admin/kalendere/${cal.id}/forhandsvisning/${door}`}>
                    <span className="n" aria-hidden="true">
                      {door}
                    </span>
                    <span className="t" aria-hidden="true">
                      {q.topic}
                    </span>
                    {!q.approved_at && <span className="dot" aria-hidden="true" />}
                    <span className="sr-only">
                      Luke {door}, {q.topic}
                      {q.approved_at ? "" : ", ikke godkjent"}
                    </span>
                  </Link>
                ) : (
                  <div className="door empty">
                    <span className="n" aria-hidden="true">
                      {door}
                    </span>
                    <span className="t" aria-hidden="true">
                      Mangler
                    </span>
                    <span className="sr-only">Luke {door}, mangler spørsmål</span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <div className="legend">
          <span>Gull prikk: ikke godkjent ennå</span>
          <span>Stripete: mangler spørsmål</span>
          <span>{formatDayMonthShort(doorDate(cal, 1))} – {formatDayMonthShort(doorDate(cal, cal.door_count))}</span>
        </div>
      </section>
    </>
  );
}
