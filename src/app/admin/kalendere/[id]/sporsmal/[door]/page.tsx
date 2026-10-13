import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { requireCalendar } from "@/lib/admin";
import { db } from "@/lib/db";
import { doorDate } from "@/lib/calendar";
import { answerCounts, getQuestion, isDoorLocked } from "@/lib/questions";
import { formatDayMonth } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { getT } from "@/i18n/server";
import type { Metadata } from "next";
import { deleteQuestionAction } from "../../../../actions";
import { CalendarAdminNav } from "../../../../_components/CalendarAdminNav";
import { QuestionEditor, type EditorValues } from "../../../../_components/QuestionEditor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.questions.editTitle };
}

export default function QuestionEditPage(props: PageProps<"/admin/kalendere/[id]/sporsmal/[door]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/kalendere/[id]/sporsmal/[door]">["params"];
  searchParams: PageProps<"/admin/kalendere/[id]/sporsmal/[door]">["searchParams"];
}) {
  const { id, door: doorParam } = await params;
  await requireAdmin(`/admin/kalendere/${id}/sporsmal/${doorParam}`);
  const cal = await requireCalendar(id);
  const door = Number(doorParam);
  if (!cal || !Number.isInteger(door) || door < 1 || door > cal.door_count) notFound();
  const sp = await searchParams;
  const t = await getT();
  const a = t.admin;

  const q = await getQuestion(cal.id, door);
  const answers = q ? (await answerCounts(cal.id)).get(q.id) ?? 0 : 0;
  const topics = (await db.query<{ topic: string }>("SELECT DISTINCT topic FROM questions WHERE calendar_id = ? ORDER BY topic", [cal.id])).map((r) => r.topic);
  const initial: EditorValues = q
    ? {
        door: q.door_number,
        topic: q.topic,
        text: q.text,
        imageUrl: q.image_url ?? "",
        explanation: q.explanation,
        sourceTitle: q.source_title ?? "",
        sourceEqsId: q.source_eqs_id ?? "",
        sourceRevisionDate: q.source_revision_date ?? "",
        approvedBy: q.approved_by ?? "",
        approvedAt: q.approved_at ?? "",
        options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: !!o.is_correct })),
      }
    : {
        door,
        topic: "",
        text: "",
        imageUrl: "",
        explanation: "",
        sourceTitle: "",
        sourceEqsId: "",
        sourceRevisionDate: "",
        approvedBy: "",
        approvedAt: "",
        options: [],
      };

  return (
    <>
      <CalendarAdminNav id={cal.id} name={cal.name} active="questions" />
      <div className="panel-head">
        <h1>
          {a.c.door(door)} · {formatDayMonth(doorDate(cal, door), t.lang)}
        </h1>
        <div className="row">
          {door > 1 && <Link href={`/admin/kalendere/${cal.id}/sporsmal/${door - 1}`}>← {a.c.door(door - 1)}</Link>}
          {door < cal.door_count && <Link href={`/admin/kalendere/${cal.id}/sporsmal/${door + 1}`}>{a.c.door(door + 1)} →</Link>}
        </div>
      </div>
      {sp.lagret === "1" && <p className="success">{a.questions.saved}</p>}
      {typeof sp.feil === "string" && <p className="alert">{sp.feil}</p>}
      <div className="panel">
        <QuestionEditor
          key={q?.id ?? `new-${door}`}
          calendarId={cal.id}
          doorCount={cal.door_count}
          existingDoor={q ? q.door_number : null}
          initial={initial}
          locked={isDoorLocked(cal, door, answers > 0)}
          answers={answers}
          topics={topics}
        />
      </div>
      {q && (
        <div className="row">
          <Link className="btn ghost" href={`/admin/kalendere/${cal.id}/forhandsvisning/${door}`}>
            {a.questions.preview}
          </Link>
          {answers === 0 && (
            <form action={deleteQuestionAction}>
              <input type="hidden" name="calendar_id" value={cal.id} />
              <input type="hidden" name="door" value={door} />
              <button className="btn danger" type="submit">
                {a.questions.delete}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
