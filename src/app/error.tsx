"use client";

import Link from "next/link";
import { t } from "@/i18n";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wrap narrow">
      <h1>{t.common.error}</h1>
      <div className="row">
        <button type="button" className="btn" onClick={() => reset()}>
          Prøv igjen
        </button>
        <Link href="/">{t.common.backHome}</Link>
      </div>
    </div>
  );
}
