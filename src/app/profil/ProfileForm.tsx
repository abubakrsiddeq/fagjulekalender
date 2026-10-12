"use client";

import { useFormAction } from "@/components/useFormAction";
import { saveProfile, type ProfileState } from "./actions";
import { t } from "@/i18n";

export function ProfileForm({ name, hideName, notify }: { name: string; hideName: boolean; notify: boolean }) {
  const [state, onSubmit, pending] = useFormAction<ProfileState>(saveProfile, {});
  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="field">
        <label htmlFor="display_name">{t.profile.nameLabel}</label>
        <input id="display_name" name="display_name" type="text" defaultValue={name} maxLength={100} required aria-describedby="name-hint" autoComplete="name" />
        <span id="name-hint" className="hint">
          {t.profile.nameHint}
        </span>
      </div>
      <label className="check">
        <input type="checkbox" name="hide_name" defaultChecked={hideName} />
        <span>{t.profile.hideLabel}</span>
      </label>
      <label className="check">
        <input type="checkbox" name="notify_daily" defaultChecked={notify} />
        <span>{t.profile.notifyLabel}</span>
      </label>
      <div role="status">
        {state.ok && <p className="success">{t.profile.saved}</p>}
        {state.error && <p className="alert">{state.error}</p>}
      </div>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {t.profile.save}
        </button>
      </div>
    </form>
  );
}
