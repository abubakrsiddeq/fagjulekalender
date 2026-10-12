"use client";

import { useFormAction } from "@/components/useFormAction";
import { addDepartment, mergeDepartmentAction, renameDepartment, type FormState } from "../actions";
import { FormMessages } from "./FormMessages";

export function AddDepartmentForm() {
  const [state, onSubmit, pending] = useFormAction<FormState>(addDepartment, {});
  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="field">
        <label htmlFor="names">Nye avdelinger (én per linje)</label>
        <textarea id="names" name="names" rows={4} required />
      </div>
      <FormMessages state={state} />
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          Legg til
        </button>
      </div>
    </form>
  );
}

export function RenameForm({ id, name }: { id: number; name: string }) {
  const [state, onSubmit, pending] = useFormAction<FormState>(renameDepartment, {});
  return (
    <form onSubmit={onSubmit} className="stack" style={{ marginTop: 8 }}>
      <input type="hidden" name="department_id" value={id} />
      <div className="inline-form">
        <label className="sr-only" htmlFor={`rename-${id}`}>
          Nytt navn for {name}
        </label>
        <input id={`rename-${id}`} name="name" type="text" defaultValue={name} required maxLength={120} />
        <button className="btn ghost small" type="submit" disabled={pending}>
          Lagre navn
        </button>
      </div>
      <FormMessages state={state} />
    </form>
  );
}

export function MergeForm({ departments }: { departments: { id: number; name: string; status: string }[] }) {
  const [state, onSubmit, pending] = useFormAction<FormState>(mergeDepartmentAction, {});
  const active = departments.filter((d) => d.status === "active");
  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="grid2">
        <div className="field">
          <label htmlFor="from_id">Slå sammen</label>
          <select id="from_id" name="from_id" required defaultValue="">
            <option value="" disabled>
              Velg avdeling…
            </option>
            {departments
              .filter((d) => d.status !== "archived")
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.status === "pending" ? " (venter)" : ""}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="into_id">…inn i</label>
          <select id="into_id" name="into_id" required defaultValue="">
            <option value="" disabled>
              Velg avdeling…
            </option>
            {active.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="small">Alle medlemmer (og poengene deres) flyttes. Den første avdelingen arkiveres.</p>
      <FormMessages state={state} />
      <div className="row">
        <button className="btn ghost" type="submit" disabled={pending}>
          Slå sammen
        </button>
      </div>
    </form>
  );
}
