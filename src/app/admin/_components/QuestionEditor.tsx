"use client";

import { useState } from "react";
import { useFormAction } from "@/components/useFormAction";
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
  const [state, onSubmit, pending] = useFormAction<FormState>(saveQuestionAction.bind(null, calendarId, existingDoor), {});
  const options = [...initial.options, ...Array.from({ length: 6 }, () => ({ id: null, text: "", isCorrect: false }))].slice(0, 6);
  const [correct, setCorrect] = useState(() => Math.max(0, options.findIndex((o) => o.isCorrect)));
  const showConfirm = locked || state.needsConfirm;

  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="grid2">
        <div className="field">
          <label htmlFor="door">Luke</label>
          <select id="door" name="door" defaultValue={initial.door} disabled={answers > 0}>
            {Array.from({ length: doorCount }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Luke {n}
              </option>
            ))}
          </select>
          {answers > 0 && <input type="hidden" name="door" value={initial.door} />}
        </div>
        <div className="field">
          <label htmlFor="topic">Tema</label>
          <input id="topic" name="topic" type="text" defaultValue={initial.topic} required maxLength={60} list="topics" />
          <datalist id="topics">
            {topics.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="field">
        <label htmlFor="text">Spørsmål</label>
        <textarea id="text" name="text" defaultValue={initial.text} required rows={3} />
      </div>

      <fieldset className="stack" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}>
        <legend style={{ fontWeight: 600, padding: "0 4px" }}>Svaralternativer (2–6). Velg det riktige.</legend>
        {options.map((o, i) => (
          <div key={i} className="option-row">
            <input
              type="radio"
              name="correct"
              value={i}
              checked={correct === i}
              onChange={() => setCorrect(i)}
              aria-label={`Alternativ ${LETTERS[i]} er riktig`}
              style={{ width: 20, height: 20, accentColor: "var(--pine)" }}
            />
            <span className="letter" aria-hidden="true">
              {LETTERS[i]}
            </span>
            <span>
              <input type="hidden" name={`option_id_${i}`} value={o.id ?? ""} />
              <label className="sr-only" htmlFor={`option_text_${i}`}>
                Alternativ {LETTERS[i]}
              </label>
              <input id={`option_text_${i}`} name={`option_text_${i}`} type="text" defaultValue={o.text} maxLength={500} />
            </span>
          </div>
        ))}
        <p className="small">La feltene stå tomme for alternativer du ikke bruker.</p>
      </fieldset>

      <div className="field">
        <label htmlFor="explanation">
          Forklaring <span className="hint">(1–2 setninger, vises etter svar)</span>
        </label>
        <textarea id="explanation" name="explanation" defaultValue={initial.explanation} required rows={3} />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="source_title">Kilde (rutinens tittel)</label>
          <input id="source_title" name="source_title" type="text" defaultValue={initial.sourceTitle} maxLength={255} />
        </div>
        <div className="field">
          <label htmlFor="source_eqs_id">EQS-ID</label>
          <input id="source_eqs_id" name="source_eqs_id" type="text" defaultValue={initial.sourceEqsId} maxLength={20} inputMode="numeric" />
        </div>
        <div className="field">
          <label htmlFor="source_revision_date">Rutinens revisjonsdato</label>
          <input id="source_revision_date" name="source_revision_date" type="date" defaultValue={initial.sourceRevisionDate} />
        </div>
        <div className="field">
          <label htmlFor="image_url">
            Bilde-URL <span className="hint">(valgfritt)</span>
          </label>
          <input id="image_url" name="image_url" type="url" defaultValue={initial.imageUrl} />
        </div>
        <div className="field">
          <label htmlFor="approved_by">Godkjent av (fagperson)</label>
          <input id="approved_by" name="approved_by" type="text" defaultValue={initial.approvedBy} maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="approved_at">Godkjent dato</label>
          <input id="approved_at" name="approved_at" type="date" defaultValue={initial.approvedAt} />
        </div>
      </div>

      {showConfirm && (
        <div className="note stack">
          <p>
            <b>Luken er åpnet{answers > 0 ? ` og har ${answers} svar` : ""}.</b> Endrer du riktig svar, blir alle lagrede svar på denne luken poengsatt på
            nytt. Endringen logges.
          </p>
          <label className="check">
            <input type="checkbox" name="confirm_open" />
            <span>Jeg bekrefter at jeg vil endre et åpnet spørsmål</span>
          </label>
          <div className="field">
            <label htmlFor="reason">Begrunnelse</label>
            <input id="reason" name="reason" type="text" maxLength={500} />
          </div>
        </div>
      )}

      <FormMessages state={state} />
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Lagrer…" : "Lagre spørsmål"}
        </button>
      </div>
    </form>
  );
}
