import { dictionaries } from "@/i18n";
import { I18nProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";

/** Reads the language cookie once and makes it available to Client Components (useT). */
export async function LocaleRoot({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <I18nProvider locale={locale}>
      <a className="skip" href="#main">
        {dictionaries[locale].nav.skipToContent}
      </a>
      {children}
    </I18nProvider>
  );
}
