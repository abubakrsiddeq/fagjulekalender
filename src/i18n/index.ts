import { nb, type Dictionary } from "./nb";
import { en } from "./en";

export type { Dictionary };
export type Locale = "nb" | "en";

export const LOCALES: Locale[] = ["nb", "en"];
export const DEFAULT_LOCALE: Locale = "nb";
/** Cookie that stores the chosen language. Not httpOnly: the inline script sets <html lang> from it. */
export const LANG_COOKIE = "fjk_lang";

export const dictionaries: Record<Locale, Dictionary> = { nb, en };

export function isLocale(value: unknown): value is Locale {
  return value === "nb" || value === "en";
}

export function getDictionary(locale: string | null | undefined): Dictionary {
  return dictionaries[isLocale(locale) ? locale : DEFAULT_LOCALE];
}
