"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { copyCalendar, type FormState } from "../actions";
import { FormMessages } from "./FormMessages";

export function CopyForm({ calendarId, year }: { calendarId: number; year: number }) {
  const c = useT().admin.copy;
  const [state, action, pending] = useActionState<FormState, FormData>(copyCalendar, {});
  return (
    <form action={action} className="stack">
      <input type="hidden" name="calendar_id" value={calendarId} />
      <div className="grid2">
        <div className="field">
          <label htmlFor={`copy-year-${calendarId}`}>{c.year}</label>
          <input id={`copy-year-${calendarId}`} name="year" type="number" defaultValue={year + 1} min={2020} max={2100} required />
        </div>
        <div className="field">
          <label htmlFor={`copy-slug-${calendarId}`}>{c.slug}</label>
          <input id={`copy-slug-${calendarId}`} name="slug" type="text" defaultValue={String(year + 1)} required />
        </div>
      </div>
      <p className="small">{c.note}</p>
      <FormMessages state={state} />
      <div className="row">
        <button className="btn ghost" type="submit" disabled={pending}>
          {c.submit}
        </button>
      </div>
    </form>
  );
}
