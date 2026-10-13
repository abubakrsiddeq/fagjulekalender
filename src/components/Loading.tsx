"use client";

import { useT } from "@/i18n/client";

export function Loading() {
  const t = useT();
  return (
    <p className="small" role="status">
      {t.common.loading}
    </p>
  );
}
