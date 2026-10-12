"use client";

import { useActionState } from "react";
import { copyCalendar, type FormState } from "../actions";
import { FormMessages } from "./FormMessages";

export function CopyForm({ calendarId, year }: { calendarId: number; year: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(copyCalendar, {});
  return (
    <form action={action} className="stack">
      <input type="hidden" name="calendar_id" value={calendarId} />
      <div className="grid2">
        <div className="field">
          <label htmlFor={`copy-year-${calendarId}`}>Nytt år</label>
          <input id={`copy-year-${calendarId}`} name="year" type="number" defaultValue={year + 1} min={2020} max={2100} required />
        </div>
        <div className="field">
          <label htmlFor={`copy-slug-${calendarId}`}>Lenke-navn</label>
          <input id={`copy-slug-${calendarId}`} name="slug" type="text" defaultValue={String(year + 1)} required />
        </div>
      </div>
      <p className="small">Kopierer innstillinger og spørsmål (ikke svar). Godkjenninger må gjøres på nytt.</p>
      <FormMessages state={state} />
      <div className="row">
        <button className="btn ghost" type="submit" disabled={pending}>
          Kopier kalender
        </button>
      </div>
    </form>
  );
}
