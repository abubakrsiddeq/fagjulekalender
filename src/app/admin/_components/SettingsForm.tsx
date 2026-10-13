"use client";

import { useFormAction } from "@/components/useFormAction";
import { useT } from "@/i18n/client";
import { saveSettings, type FormState } from "../actions";
import { FormMessages } from "./FormMessages";

export function SettingsForm({
  initial,
}: {
  initial: { name: string; domains: string; allowProposals: boolean; brandColor: string; logoUrl: string };
}) {
  const a = useT().admin;
  const s = a.settings;
  const [state, onSubmit, pending] = useFormAction<FormState>(saveSettings, {});
  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="field">
        <label htmlFor="name">{s.orgName}</label>
        <input id="name" name="name" type="text" defaultValue={initial.name} required maxLength={200} />
      </div>
      <div className="field">
        <label htmlFor="allowed_email_domains">{s.domains}</label>
        <input id="allowed_email_domains" name="allowed_email_domains" type="text" defaultValue={initial.domains} placeholder="oslo.kommune.no" />
        <span className="hint">{s.domainsHint}</span>
      </div>
      <label className="check">
        <input type="checkbox" name="allow_department_proposals" defaultChecked={initial.allowProposals} />
        <span>{s.proposals}</span>
      </label>
      <div className="grid2">
        <div className="field">
          <label htmlFor="brand_color">{s.brandColor}</label>
          <input id="brand_color" name="brand_color" type="text" defaultValue={initial.brandColor} placeholder="#1E4A38" pattern="#[0-9a-fA-F]{6}" />
          <span className="hint">{s.brandColorHint}</span>
        </div>
        <div className="field">
          <label htmlFor="logo_url">{s.logoUrl}</label>
          <input id="logo_url" name="logo_url" type="url" defaultValue={initial.logoUrl} />
        </div>
      </div>
      <FormMessages state={state} />
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {a.c.save}
        </button>
      </div>
    </form>
  );
}
