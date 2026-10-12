import { t } from "@/i18n";

export function Loading() {
  return (
    <p className="small" role="status">
      {t.common.loading}
    </p>
  );
}
