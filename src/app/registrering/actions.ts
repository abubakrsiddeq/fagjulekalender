"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getCurrentUser, safeReturnPath } from "@/lib/auth";
import { parseRegistration, saveRegistration } from "@/lib/registration";
import { t } from "@/i18n";

export interface RegistrationState {
  ok?: boolean;
  message?: string;
  errors?: string[];
  next?: string;
}

export async function saveRegistrationAction(mode: "register" | "profile", _prev: RegistrationState, fd: FormData): Promise<RegistrationState> {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn?neste=/registrering");
  const res = await saveRegistration(user, parseRegistration(fd));
  if (!res.ok) return { errors: res.errors };
  if (mode === "register") {
    // The form does a full page load to `next`, so no stale router cache can send the
    // participant back here (pages redirect to /registrering until this is done).
    return { ok: true, next: safeReturnPath(String(fd.get("next") ?? "/")) };
  }
  refresh();
  const locked = res.lockedCalendars.length ? ` ${t.registration.lockedNote(res.lockedCalendars.join(", "))}` : "";
  return { ok: true, message: `${t.profile.saved}${locked}` };
}
