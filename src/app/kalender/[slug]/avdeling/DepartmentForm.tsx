"use client";

import { useState } from "react";
import { useFormAction } from "@/components/useFormAction";
import { joinDepartment, type JoinState } from "./actions";
import { useT } from "@/i18n/client";

export function DepartmentForm({
  slug,
  departments,
  currentId,
  defaultId,
  notify,
  allowProposals,
  inline,
}: {
  slug: string;
  departments: { id: number; name: string; pending: boolean }[];
  currentId: number | null;
  defaultId: number | null;
  notify: boolean;
  allowProposals: boolean;
  inline: boolean;
}) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<JoinState>(joinDepartment.bind(null, slug), {});
  const [proposing, setProposing] = useState(false);

  return (
    <form onSubmit={onSubmit} className="stack">
      {inline && <input type="hidden" name="inline" value="1" />}
      {!proposing ? (
        <div className="field">
          <label htmlFor="department">{t.department.label}</label>
          <select id="department" name="department" defaultValue={defaultId ?? ""} required>
            <option value="" disabled>
              {t.department.choose}
            </option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.pending ? ` (${t.department.pendingNote})` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="field">
          <label htmlFor="proposal">{t.department.proposeLabel}</label>
          <input id="proposal" name="proposal" type="text" maxLength={120} required autoFocus aria-describedby="proposal-hint" />
          <span id="proposal-hint" className="hint">
            {t.department.proposeHint}
          </span>
        </div>
      )}
      {allowProposals && (
        <p>
          <button type="button" className="linkbtn" onClick={() => setProposing((p) => !p)} aria-expanded={proposing}>
            {proposing ? t.department.chooseFromList : t.department.proposeToggle}
          </button>
        </p>
      )}
      <label className="check">
        <input type="checkbox" name="notify" defaultChecked={notify} />
        <span>{t.department.notifyLabel}</span>
      </label>
      {state.error && (
        <p className="alert" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn block" type="submit" disabled={pending}>
        {proposing ? t.department.proposeSave : currentId ? t.department.saveChange : t.department.save}
      </button>
    </form>
  );
}
