"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { t } from "@/i18n";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: "email", email: "", next });

  if (state.step === "email") {
    return (
      <form action={action} className="stack" noValidate>
        <input type="hidden" name="next" value={state.next} />
        <div className="field">
          <label htmlFor="email">{t.login.emailLabel}</label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.email}
            required
            autoFocus
            aria-describedby="email-hint"
            aria-invalid={state.error ? true : undefined}
          />
          <span id="email-hint" className="hint">
            {t.login.emailHint}
          </span>
        </div>
        {state.error && (
          <p className="alert" role="alert">
            {state.error}
          </p>
        )}
        <button className="btn block" type="submit" name="intent" value="send" disabled={pending}>
          {pending ? t.login.sending : t.login.sendCode}
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="stack" noValidate>
      <input type="hidden" name="next" value={state.next} />
      <input type="hidden" name="email" value={state.email} />
      <div className="field">
        <label htmlFor="code">{t.login.codeLabel}</label>
        <input
          id="code"
          name="code"
          className="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          autoFocus
          aria-describedby="code-hint"
          aria-invalid={state.error ? true : undefined}
        />
        <span id="code-hint" className="hint">
          {t.login.codeHint(state.email)}
        </span>
      </div>
      {state.error && (
        <p className="alert" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn block" type="submit" name="intent" value="verify" disabled={pending}>
        {pending ? t.login.verifying : t.login.verify}
      </button>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button className="linkbtn" type="submit" name="intent" value="resend" disabled={pending}>
          {t.login.resend}
        </button>
        <button className="linkbtn" type="submit" name="intent" value="restart" disabled={pending}>
          {t.login.otherEmail}
        </button>
      </div>
    </form>
  );
}
