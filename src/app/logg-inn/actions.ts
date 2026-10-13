"use server";

import { redirect } from "next/navigation";
import { clientIp, safeReturnPath } from "@/lib/auth";
import { normalizeEmail, requestLoginCode, verifyLoginCode } from "@/lib/login";
import { rateLimit } from "@/lib/ratelimit";
import { getT } from "@/i18n/server";

export interface LoginState {
  step: "email" | "code";
  email: string;
  next: string;
  error?: string;
  info?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const intent = String(formData.get("intent") ?? "");
  const next = safeReturnPath(String(formData.get("next") ?? "/"));
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const ip = await clientIp();
  const t = await getT();

  if (intent === "restart") return { step: "email", email: "", next };

  if (intent === "send" || intent === "resend") {
    const step = intent === "resend" ? "code" : "email";
    try {
      const res = await requestLoginCode(email, ip);
      if (!res.ok) return { step, email, next, error: res.error };
    } catch (err) {
      console.error("Sending sign-in code failed", err);
      return { step, email, next, error: t.login.sendFailed };
    }
    return { step: "code", email, next };
  }

  if (intent === "verify") {
    if (!rateLimit(`verify:${ip}`, 30, 15 * 60_000)) return { step: "code", email, next, error: t.login.tooManyAttempts };
    const res = await verifyLoginCode(email, String(formData.get("code") ?? ""));
    if (!res.ok) return { step: "code", email, next, error: res.error };
    // First sign-in: registration (Kommune, Bydel, Avdeling, Ressursnummer, Ansvarlig) comes first.
    if (!res.user.registered_at && !next.startsWith("/admin")) redirect(`/registrering?neste=${encodeURIComponent(next)}`);
    redirect(next);
  }

  return { step: "email", email, next };
}
