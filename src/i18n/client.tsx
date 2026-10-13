"use client";

import { createContext, use } from "react";
import { DEFAULT_LOCALE, dictionaries, type Locale } from "./index";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return use(LocaleContext);
}

/** Texts in the visitor's language, for Client Components. */
export function useT() {
  return dictionaries[useLocale()];
}
