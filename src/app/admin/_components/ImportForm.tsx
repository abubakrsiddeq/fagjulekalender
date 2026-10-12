"use client";

import { useActionState } from "react";
import { importQuestionsAction, type ImportState } from "../actions";

export function ImportForm({ calendarId }: { calendarId: number }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importQuestionsAction.bind(null, calendarId), {});
  const r = state.report;
  return (
    <form action={action} className="stack">
      <div className="field">
        <label htmlFor="file">CSV-fil</label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" aria-describedby="file-hint" />
        <span id="file-hint" className="hint">
          Én rad per luke. Kolonner: door, topic, question, option_a … option_f, correct (A–F), explanation, source_title, source_eqs_id,
          source_revision_date, image_url, approved_by, approved_at. Last ned eksporten for en mal. Excel: Lagre som «CSV UTF-8».
        </span>
      </div>
      <details>
        <summary className="small">…eller lim inn CSV-tekst</summary>
        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor="csv_text">CSV-tekst</label>
          <textarea id="csv_text" name="csv_text" rows={6} />
        </div>
      </details>
      <label className="check">
        <input type="checkbox" name="overwrite_opened" />
        <span>Overskriv også luker som er åpnet (luker med svar blir aldri overskrevet)</span>
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
          <p className="success">
            Importerte {r.imported.length} spørsmål (luke {r.imported.join(", ")}).
          </p>
        )}
        {r && r.skipped.length > 0 && (
          <div className="note">
            Hoppet over {r.skipped.length}:
            <ul>
              {r.skipped.map((s) => (
                <li key={String(s.door)}>
                  Luke {s.door}: {s.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Importerer…" : "Importer"}
        </button>
      </div>
    </form>
  );
}
