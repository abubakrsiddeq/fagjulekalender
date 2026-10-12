"use client";

import { useFormAction } from "@/components/useFormAction";
import { saveSettings, type FormState } from "../actions";
import { FormMessages } from "./FormMessages";

export function SettingsForm({
  initial,
}: {
  initial: { name: string; domains: string; allowProposals: boolean; brandColor: string; logoUrl: string };
}) {
  const [state, onSubmit, pending] = useFormAction<FormState>(saveSettings, {});
  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="field">
        <label htmlFor="name">Navn på organisasjonen</label>
        <input id="name" name="name" type="text" defaultValue={initial.name} required maxLength={200} />
      </div>
      <div className="field">
        <label htmlFor="allowed_email_domains">Tillatte e-postdomener</label>
        <input id="allowed_email_domains" name="allowed_email_domains" type="text" defaultValue={initial.domains} placeholder="oslo.kommune.no" />
        <span className="hint">Skill flere med komma. Tomt felt og tom invitasjonsliste betyr at alle kan logge inn.</span>
      </div>
      <label className="check">
        <input type="checkbox" name="allow_department_proposals" defaultChecked={initial.allowProposals} />
        <span>Deltakere kan foreslå nye avdelinger (blir synlige etter godkjenning)</span>
      </label>
      <div className="grid2">
        <div className="field">
          <label htmlFor="brand_color">Profilfarge</label>
          <input id="brand_color" name="brand_color" type="text" defaultValue={initial.brandColor} placeholder="#1E4A38" pattern="#[0-9a-fA-F]{6}" />
          <span className="hint">Mørk farge med god kontrast mot hvit tekst. Tomt = standard grønn.</span>
        </div>
        <div className="field">
          <label htmlFor="logo_url">Logo-URL (https)</label>
          <input id="logo_url" name="logo_url" type="url" defaultValue={initial.logoUrl} />
        </div>
      </div>
      <FormMessages state={state} />
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          Lagre
        </button>
      </div>
    </form>
  );
}
