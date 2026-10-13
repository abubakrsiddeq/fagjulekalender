"use client";

import { useFormAction } from "@/components/useFormAction";
import { useT } from "@/i18n/client";
import { addInvites, type FormState } from "../actions";
import { FormMessages } from "./FormMessages";

export function InviteForm() {
  const i = useT().admin.invites;
  const [state, onSubmit, pending] = useFormAction<FormState>(addInvites, {});
  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="field">
        <label htmlFor="emails">{i.label}</label>
        <textarea id="emails" name="emails" rows={4} placeholder={i.placeholder} required />
        <span className="hint">{i.hint}</span>
      </div>
      <FormMessages state={state} />
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {i.submit}
        </button>
      </div>
    </form>
  );
}
