"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLocale, LANG_COOKIE } from "@/i18n";

/** Saves the chosen language in a cookie (and on the user, for e-mails) and re-renders the page. */
export async function setLanguage(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LANG_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: false });
  const user = await getCurrentUser();
  if (user) await db.execute("UPDATE users SET locale = ? WHERE id = ?", [locale, user.id]);
  refresh();
}
