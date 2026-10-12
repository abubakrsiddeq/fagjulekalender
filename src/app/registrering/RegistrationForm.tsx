"use client";

import { useEffect, useState } from "react";
import { useFormAction } from "@/components/useFormAction";
import { saveRegistrationAction, type RegistrationState } from "./actions";
import { t } from "@/i18n";

export interface RegistrationInitial {
  displayName: string;
  kommune: string;
  bydel: string;
  ressursnummer: string;
  ansvarlig: string;
  departmentId: number | null;
  hideName: boolean;
  notify: boolean;
}

export function RegistrationForm({
  mode,
  next,
  initial,
  departments,
  allowProposals,
  kommuner,
  bydeler,
}: {
  mode: "register" | "profile";
  next?: string;
  initial: RegistrationInitial;
  departments: { id: number; name: string; pending: boolean }[];
  allowProposals: boolean;
  kommuner: string[];
  bydeler: string[];
}) {
  const r = t.registration;
  const [state, onSubmit, pending] = useFormAction<RegistrationState>(saveRegistrationAction.bind(null, mode), {});
  const [proposing, setProposing] = useState(false);

  useEffect(() => {
    if (state.ok && state.next) window.location.assign(state.next);
  }, [state]);

  return (
    <form onSubmit={onSubmit} className="stack" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      <Field id="display_name" label={r.name} hint={r.nameHint}>
        <input id="display_name" name="display_name" type="text" defaultValue={initial.displayName} required maxLength={100} autoComplete="name" aria-describedby="display_name-hint" />
      </Field>

      <div className="grid2">
        <Field id="kommune" label={r.kommune} hint={r.kommuneHint}>
          <input id="kommune" name="kommune" type="text" defaultValue={initial.kommune} required maxLength={100} list="kommune-list" autoComplete="address-level2" aria-describedby="kommune-hint" />
          <datalist id="kommune-list">
            {kommuner.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </Field>
        <Field id="bydel" label={`${r.bydel} (${r.optional})`} hint={r.bydelHint}>
          <input id="bydel" name="bydel" type="text" defaultValue={initial.bydel} maxLength={100} list="bydel-list" autoComplete="address-level3" aria-describedby="bydel-hint" />
          <datalist id="bydel-list">
            {bydeler.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>
      </div>

      {!proposing ? (
        <Field id="department" label={r.avdeling} hint={r.avdelingHint}>
          <select id="department" name="department" defaultValue={initial.departmentId ?? ""} required aria-describedby="department-hint">
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
        </Field>
      ) : (
        <Field id="proposal" label={t.department.proposeLabel} hint={t.department.proposeHint}>
          <input id="proposal" name="proposal" type="text" maxLength={120} required autoFocus aria-describedby="proposal-hint" />
        </Field>
      )}
      {allowProposals && (
        <p>
          <button type="button" className="linkbtn" onClick={() => setProposing((p) => !p)} aria-expanded={proposing}>
            {proposing ? t.department.chooseFromList : t.department.proposeToggle}
          </button>
        </p>
      )}

      <div className="grid2">
        <Field id="ressursnummer" label={r.ressursnummer} hint={r.ressursnummerHint}>
          <input id="ressursnummer" name="ressursnummer" type="text" defaultValue={initial.ressursnummer} required maxLength={40} autoComplete="off" spellCheck={false} aria-describedby="ressursnummer-hint" />
        </Field>
        <Field id="ansvarlig" label={r.ansvarlig} hint={r.ansvarligHint}>
          <input id="ansvarlig" name="ansvarlig" type="text" defaultValue={initial.ansvarlig} required maxLength={120} autoComplete="off" aria-describedby="ansvarlig-hint" />
        </Field>
      </div>

      <label className="check">
        <input type="checkbox" name="notify_daily" defaultChecked={initial.notify} />
        <span>{t.profile.notifyLabel}</span>
      </label>
      <label className="check">
        <input type="checkbox" name="hide_name" defaultChecked={initial.hideName} />
        <span>{t.profile.hideLabel}</span>
      </label>

      <div role="status" aria-live="polite">
        {state.message && <p className="success">{state.message}</p>}
        {state.errors?.length ? (
          <div className="alert">
            {state.errors.length === 1 ? (
              state.errors[0]
            ) : (
              <ul>
                {state.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
      <div className="row">
        <button className={`btn${mode === "register" ? " block" : ""}`} type="submit" disabled={pending || (mode === "register" && !!state.ok)}>
          {pending ? r.saving : mode === "register" ? r.submit : t.profile.save}
        </button>
      </div>
    </form>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      <span id={`${id}-hint`} className="hint">
        {hint}
      </span>
    </div>
  );
}
