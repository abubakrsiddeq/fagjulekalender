import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { loadCalendarPage } from "@/lib/context";
import { answerBlock, doorDate, doorOpensAt } from "@/lib/calendar";
import { getAnswerResult, getPublicQuestion } from "@/lib/answers";
import { formatDayMonth } from "@/lib/time";
import { Loading } from "@/components/Loading";
import { StaticOptions } from "@/components/QuestionView";
import { AnswerForm } from "./AnswerForm";
import { getT } from "@/i18n/server";

export default function DoorPage(props: PageProps<"/kalender/[slug]/luke/[door]">) {
  return (
    <div className="wrap narrow" style={{ maxWidth: 680 }}>
      <Suspense fallback={<Loading />}>
        <DoorContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function DoorContent({ params }: { params: PageProps<"/kalender/[slug]/luke/[door]">["params"] }) {
  const { slug, door: doorParam } = await params;
  const door = Number(doorParam);
  const { user, cal, membership } = await loadCalendarPage(slug, `/kalender/${slug}/luke/${doorParam}`);
  const t = await getT();
  if (!Number.isInteger(door) || door < 1 || door > cal.door_count) notFound();

  const now = new Date();
  const date = formatDayMonth(doorDate(cal, door), t.lang);
  const back = (
    <p className="crumbs">
      <Link href={`/kalender/${slug}`}>← {t.question.back}</Link>
    </p>
  );

  if (!membership && cal.status === "published") {
    return (
      <>
        {back}
        <h1>{t.question.doorTitle(door, date)}</h1>
        <p className="note">
          {t.question.noDepartment} <Link href={`/kalender/${slug}`}>{t.department.title}</Link>
        </p>
      </>
    );
  }

  // Locked doors show nothing about the question, not even the topic.
  if (now < doorOpensAt(cal, door)) {
    return (
      <>
        {back}
        <h1>{t.question.doorTitle(door, date)}</h1>
        <p className="note">{t.question.locked(date)}</p>
      </>
    );
  }

  const question = await getPublicQuestion(cal, door, user.id);
  if (!question) {
    return (
      <>
        {back}
        <h1>{t.question.doorTitle(door, date)}</h1>
        <p className="note">{t.question.empty}</p>
      </>
    );
  }
  const result = await getAnswerResult(cal, question.id, user.id);
  const block = answerBlock(cal, door, now);

  return (
    <>
      {back}
      <article className="panel" aria-labelledby="q-title">
        <div className="q-head">
          <span className="eyebrow">{t.question.doorTitle(door, date)}</span>
          <span>
            <span className="badge">{question.topic}</span>
          </span>
          <h1 id="q-title" className="q-text" style={{ color: "var(--fg)" }}>
            {question.text}
          </h1>
        </div>
        {question.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={question.imageUrl} alt="" style={{ borderRadius: 8 }} />
        )}
        {result || !block ? (
          // Same component before and after answering, so it stays mounted (and keeps focus) on refresh.
          <AnswerForm slug={slug} door={door} options={question.options} initialResult={result} />
        ) : (
          <>
            <StaticOptions options={question.options} result={null} />
            <p className="note">{block === "not_published" ? t.calendar.draft : t.question.closed}</p>
          </>
        )}
      </article>
    </>
  );
}
