"use client";

import { useState } from "react";
import { useFormAction } from "@/components/useFormAction";
import { useT } from "@/i18n/client";
import { saveQuestionAction, type FormState } from "../actions";
import { FormMessages } from "./FormMessages";

export interface EditorValues {
  door: number;
  topic: string;
  text: string;
  imageUrl: string;
  explanation: string;
  sourceTitle: string;
  sourceEqsId: string;
  sourceRevisionDate: string;
  approvedBy: string;
  approvedAt: string;
  options: { id: number | null; text: string; isCorrect: boolean }[];
}

const LETTERS = "ABCDEF";

export function QuestionEditor({
  calendarId,
  doorCount,
  existingDoor,
  initial,
  locked,
  answers,
  topics,
}: {
  calendarId: number;
  doorCount: number;
  existingDoor: number | null;
  initial: EditorValues;
  locked: boolean;
  answers: number;
  topics: string[];
}) {
  const t = useT();
  const e = t.admin.editor;
  const [state, onSubmit, pending] = useFormAction<FormState>(saveQuestionAction.bind(null, calendarId, existingDoor), {});
  const options = [...initial.options, ...Array.from({ length: 6 }, () => ({ id: null, text: "", isCorrect: false }))].slice(0, 6);
  const [correct, setCorrect] = useState(() => Math.max(0, options.findIndex((o) => o.isCorrect)));
  const showConfirm = locked || state.needsConfirm;

  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="grid2">
        <div className="field">
          <label htmlFor="door">{e.door}</label>
          <select id="door" name="door" defaultValue={initial.door} disabled={answers > 0}>
            {Array.from({ length: doorCount }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {t.admin.c.door(n)}
              </option>
            ))}
          </select>
          {answers > 0 && <input type="hidden" name="door" value={initial.door} />}
        </div>
        <div className="field">
          <label htmlFor="topic">{e.topic}</label>
          <input id="topic" name="topic" type="text" defaultValue={initial.topic} required maxLength={60} list="topics" />
          <datalist id="topics">
            {topics.map((topic) => (
              <option key={topic} value={topic} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="field">
        <label htmlFor="text">{e.question}</label>
        <textarea id="text" name="text" defaultValue={initial.text} required rows={3} />
      </div>

      <fieldset className="stack" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}>
        <legend style={{ fontWeight: 600, padding: "0 4px" }}>{e.optionsLegend}</legend>
        {options.map((o, i) => (
          <div key={i} className="option-row">
            <input
              type="radio"
              name="correct"
              value={i}
              checked={correct === i}
              onChange={() => setCorrect(i)}
              aria-label={e.optionIsCorrect(LETTERS[i])}
              style={{ width: 20, height: 20, accentColor: "var(--pine)" }}
            />
            <span className="letter" aria-hidden="true">
              {LETTERS[i]}
            </span>
            <span>
              <input type="hidden" name={`option_id_${i}`} value={o.id ?? ""} />
              <label className="sr-only" htmlFor={`option_text_${i}`}>
                {e.option(LETTERS[i])}
              </label>
              <input id={`option_text_${i}`} name={`option_text_${i}`} type="text" defaultValue={o.text} maxLength={500} />
            </span>
          </div>
        ))}
        <p className="small">{e.optionsHint}</p>
      </fieldset>

      <div className="field">
        <label htmlFor="explanation">
          {e.explanation} <span className="hint">{e.explanationHint}</span>
        </label>
        <textarea id="explanation" name="explanation" defaultValue={initial.explanation} required rows={3} />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="source_title">{e.sourceTitle}</label>
          <input id="source_title" name="source_title" type="text" defaultValue={initial.sourceTitle} maxLength={255} />
        </div>
        <div className="field">
          <label htmlFor="source_eqs_id">{e.eqsId}</label>
          <input id="source_eqs_id" name="source_eqs_id" type="text" defaultValue={initial.sourceEqsId} maxLength={20} inputMode="numeric" />
        </div>
        <div className="field">
          <label htmlFor="source_revision_date">{e.revisionDate}</label>
          <input id="source_revision_date" name="source_revision_date" type="date" defaultValue={initial.sourceRevisionDate} />
        </div>
        <div className="field">
          <label htmlFor="image_url">
            {e.imageUrl} <span className="hint">{e.optional}</span>
          </label>
          <input id="image_url" name="image_url" type="url" defaultValue={initial.imageUrl} />
        </div>
        <div className="field">
          <label htmlFor="approved_by">{e.approvedBy}</label>
          <input id="approved_by" name="approved_by" type="text" defaultValue={initial.approvedBy} maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="approved_at">{e.approvedAt}</label>
          <input id="approved_at" name="approved_at" type="date" defaultValue={initial.approvedAt} />
        </div>
      </div>

      {showConfirm && (
        <div className="note stack">
          <p>
            <b>{e.openedWarning(answers)}</b> {e.openedExplain}
          </p>
          <label className="check">
            <input type="checkbox" name="confirm_open" />
            <span>{e.confirm}</span>
          </label>
          <div className="field">
            <label htmlFor="reason">{t.admin.c.reason}</label>
            <input id="reason" name="reason" type="text" maxLength={500} />
          </div>
        </div>
      )}

      <FormMessages state={state} />
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? t.admin.c.saving : e.save}
        </button>
      </div>
    </form>
  );
}
