import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { DEFAULT_LOCALE, dictionaries, isLocale, LANG_COOKIE, type Locale } from "./index";

/** The visitor's language (cookie), cached for one request. Request-time only, like the session. */
export const getLocale = cache(async (): Promise<Locale> => {
  await connection();
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** Texts in the visitor's language, for Server Components, Server Actions and Route Handlers. */
export async function getT() {
  return dictionaries[await getLocale()];
}
