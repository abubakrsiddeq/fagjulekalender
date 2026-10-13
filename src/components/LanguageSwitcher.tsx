"use client";

import { useTransition } from "react";
import { setLanguage } from "@/app/language-actions";
import { useT } from "@/i18n/client";

/** Shows the other language's name, in that language ("English" / "Norsk"). */
export function LanguageSwitcher() {
  const t = useT();
  const [pending, start] = useTransition();
  const { target, label, title } = t.switchLanguage;
  return (
    <button
      type="button"
      className="lang-btn"
      lang={target}
      title={title}
      disabled={pending}
      onClick={() =>
        start(async () => {
          document.documentElement.lang = target;
          await setLanguage(target);
        })
      }
    >
      {label}
    </button>
  );
}
