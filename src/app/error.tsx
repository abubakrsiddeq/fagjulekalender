"use client";

import Link from "next/link";
import { useT } from "@/i18n/client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <div className="wrap narrow">
      <h1>{t.common.error}</h1>
      <div className="row">
        <button type="button" className="btn" onClick={() => reset()}>
          {t.common.tryAgain}
        </button>
        <Link href="/">{t.common.backHome}</Link>
      </div>
    </div>
  );
}
