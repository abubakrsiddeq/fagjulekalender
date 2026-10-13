"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { importQuestionsAction, type ImportState } from "../actions";

export function ImportForm({ calendarId }: { calendarId: number }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importQuestionsAction.bind(null, calendarId), {});
  const t = useT();
  const f = t.admin.importForm;
  const r = state.report;
  return (
    <form action={action} className="stack">
      <div className="field">
        <label htmlFor="file">{f.file}</label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" aria-describedby="file-hint" />
        <span id="file-hint" className="hint">
          {f.fileHint}
        </span>
      </div>
      <details>
        <summary className="small">{f.pasteToggle}</summary>
        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor="csv_text">{f.pasteLabel}</label>
          <textarea id="csv_text" name="csv_text" rows={6} />
        </div>
      </details>
      <label className="check">
        <input type="checkbox" name="overwrite_opened" />
        <span>{f.overwrite}</span>
      </label>
      <div role="status" aria-live="polite" className="stack">
        {state.error && <p className="alert">{state.error}</p>}
        {r && r.errors.length > 0 && (
          <div className="alert">
            <ul>
              {r.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {r && r.imported.length > 0 && (
          <p className="success">{f.imported(r.imported.length, r.imported.join(", "))}</p>
        )}
        {r && r.skipped.length > 0 && (
          <div className="note">
            {f.skipped(r.skipped.length)}
            <ul>
              {r.skipped.map((s) => (
                <li key={String(s.door)}>
                  {t.admin.editor.door} {s.door}: {s.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? f.submitting : f.submit}
        </button>
      </div>
    </form>
  );
}
