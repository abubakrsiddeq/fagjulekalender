"use client";

import { useFormAction } from "@/components/useFormAction";
import { useT } from "@/i18n/client";
import { addDepartment, mergeDepartmentAction, renameDepartment, type FormState } from "../actions";
import { FormMessages } from "./FormMessages";

export function AddDepartmentForm() {
  const d = useT().admin.departments;
  const [state, onSubmit, pending] = useFormAction<FormState>(addDepartment, {});
  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="field">
        <label htmlFor="names">{d.addLabel}</label>
        <textarea id="names" name="names" rows={4} required />
      </div>
      <FormMessages state={state} />
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {d.add}
        </button>
      </div>
    </form>
  );
}

export function RenameForm({ id, name }: { id: number; name: string }) {
  const d = useT().admin.departments;
  const [state, onSubmit, pending] = useFormAction<FormState>(renameDepartment, {});
  return (
    <form onSubmit={onSubmit} className="stack" style={{ marginTop: 8 }}>
      <input type="hidden" name="department_id" value={id} />
      <div className="inline-form">
        <label className="sr-only" htmlFor={`rename-${id}`}>
          {d.renameLabel(name)}
        </label>
        <input id={`rename-${id}`} name="name" type="text" defaultValue={name} required maxLength={120} />
        <button className="btn ghost small" type="submit" disabled={pending}>
          {d.saveName}
        </button>
      </div>
      <FormMessages state={state} />
    </form>
  );
}

export function MergeForm({ departments }: { departments: { id: number; name: string; status: string }[] }) {
  const a = useT().admin;
  const d = a.departments;
  const [state, onSubmit, pending] = useFormAction<FormState>(mergeDepartmentAction, {});
  const active = departments.filter((x) => x.status === "active");
  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="grid2">
        <div className="field">
          <label htmlFor="from_id">{d.mergeFrom}</label>
          <select id="from_id" name="from_id" required defaultValue="">
            <option value="" disabled>
              {a.c.chooseDepartment}
            </option>
            {departments
              .filter((x) => x.status !== "archived")
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                  {x.status === "pending" ? d.pendingSuffix : ""}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="into_id">{d.mergeInto}</label>
          <select id="into_id" name="into_id" required defaultValue="">
            <option value="" disabled>
              {a.c.chooseDepartment}
            </option>
            {active.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="small">{d.mergeNote}</p>
      <FormMessages state={state} />
      <div className="row">
        <button className="btn ghost" type="submit" disabled={pending}>
          {d.merge}
        </button>
      </div>
    </form>
  );
}
