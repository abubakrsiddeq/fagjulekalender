"use client";

import { useFormAction } from "@/components/useFormAction";
import { addInvites, type FormState } from "../actions";
import { FormMessages } from "./FormMessages";

export function InviteForm() {
  const [state, onSubmit, pending] = useFormAction<FormState>(addInvites, {});
  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="field">
        <label htmlFor="emails">E-postadresser</label>
        <textarea id="emails" name="emails" rows={4} placeholder="En per linje, eller skilt med komma" required />
        <span className="hint">Kan limes inn rett fra Excel.</span>
      </div>
      <FormMessages state={state} />
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          Legg til i invitasjonslisten
        </button>
      </div>
    </form>
  );
}
