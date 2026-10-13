import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { requireCalendar } from "@/lib/admin";
import { doorDate } from "@/lib/calendar";
import { LETTERS } from "@/lib/answers";
import { getQuestion } from "@/lib/questions";
import { formatDate, formatDayMonth } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { ResultBox, StaticOptions } from "@/components/QuestionView";
import { getT } from "@/i18n/server";
import { CalendarAdminNav } from "../../../../_components/CalendarAdminNav";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.preview.title };
}

export default function PreviewDoorPage(props: PageProps<"/admin/kalendere/[id]/forhandsvisning/[door]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/admin/kalendere/[id]/forhandsvisning/[door]">["params"] }) {
  const { id, door: doorParam } = await params;
  await requireAdmin(`/admin/kalendere/${id}/forhandsvisning/${doorParam}`);
  const cal = await requireCalendar(id);
  const door = Number(doorParam);
  if (!cal || !Number.isInteger(door) || door < 1 || door > cal.door_count) notFound();
  const t = await getT();
  const a = t.admin;
  const q = await getQuestion(cal.id, door);
  const date = formatDayMonth(doorDate(cal, door), t.lang);
  const result = q && {
    optionId: null,
    isCorrect: true,
    correctOptionId: q.options.find((o) => o.is_correct)?.id ?? 0,
    points: cal.points_correct,
    explanation: q.explanation,
    sourceTitle: q.source_title,
    sourceEqsId: q.source_eqs_id,
  };

  return (
    <>
      <CalendarAdminNav id={cal.id} name={cal.name} active="preview" />
      <div className="panel-head">
        <div className="row">
          {door > 1 && <Link href={`/admin/kalendere/${cal.id}/forhandsvisning/${door - 1}`}>← {a.c.door(door - 1)}</Link>}
          {door < cal.door_count && <Link href={`/admin/kalendere/${cal.id}/forhandsvisning/${door + 1}`}>{a.c.door(door + 1)} →</Link>}
        </div>
        <Link href={`/admin/kalendere/${cal.id}/sporsmal/${door}`}>{a.c.edit}</Link>
      </div>
      {!q || !result ? (
        <p className="note">{a.preview.noQuestion(door)}</p>
      ) : (
        <article className="panel" style={{ maxWidth: 680 }} aria-labelledby="q-title">
          <div className="q-head">
            <span className="eyebrow">
              {a.c.door(door)} · {date}
            </span>
            <span>
              <span className="badge">{q.topic}</span>{" "}
              {q.approved_at ? (
                <span className="badge ok">{a.preview.approvedBy(q.approved_by ?? "", formatDate(q.approved_at))}</span>
              ) : (
                <span className="badge warn">{a.questions.notApproved}</span>
              )}
            </span>
            <h1 id="q-title" className="q-text" style={{ color: "var(--fg)" }}>
              {q.text}
            </h1>
          </div>
          {q.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.image_url} alt="" style={{ borderRadius: 8 }} />
          )}
          <StaticOptions options={q.options.map((o, i) => ({ id: o.id, text: o.text, letter: LETTERS[i] }))} result={result} />
          <ResultBox preview result={result} />
        </article>
      )}
    </>
  );
}
