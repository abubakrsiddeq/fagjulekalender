"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ResultBox, StaticOptions, type ViewOption, type ViewResult } from "@/components/QuestionView";
import { t } from "@/i18n";

export function AnswerForm({
  slug,
  door,
  options,
  initialResult,
}: {
  slug: string;
  door: number;
  options: ViewOption[];
  initialResult: ViewResult | null;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ViewResult | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (result) resultHeading.current?.focus();
  }, [result]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (picked == null) {
      setError(t.question.pickFirst);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/kalender/${encodeURIComponent(slug)}/luker/${door}/svar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: picked }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.result) {
        setResult(data.result);
        router.refresh();
      } else if (res.status === 409) {
        // Already answered (e.g. in another tab): reload to show the stored result.
        router.refresh();
        setError(t.question.alreadyAnswered);
      } else {
        setError(data?.message ?? t.question.error);
      }
    } catch {
      setError(t.question.error);
    } finally {
      setPending(false);
    }
  }

  const shown = result ?? initialResult;
  if (shown) {
    return (
      <div className="stack" aria-live="polite">
        <StaticOptions options={options} result={shown} />
        <ResultBox result={shown} headingRef={resultHeading} />
        <div className="row">
          <Link className="btn" href={`/kalender/${slug}`}>
            {t.question.nextDoor}
          </Link>
          <Link className="btn ghost" href={`/kalender/${slug}/resultater`}>
            {t.question.seeResults}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="stack">
      <fieldset className="opts">
        <legend>
          {t.question.legend}. {t.question.oneAttempt}
        </legend>
        {options.map((o) => (
          <label key={o.id} className="opt">
            <input type="radio" name="option" value={o.id} checked={picked === o.id} onChange={() => setPicked(o.id)} />
            <span className="k" aria-hidden="true">
              {o.letter}
            </span>
            <span>{o.text}</span>
          </label>
        ))}
      </fieldset>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      <div className="row end">
        <button className="btn" type="submit" disabled={pending || picked == null} aria-disabled={picked == null}>
          {pending ? t.question.submitting : t.question.submit}
        </button>
      </div>
    </form>
  );
}
