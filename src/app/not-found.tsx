import Link from "next/link";
import { t } from "@/i18n";

export default function NotFound() {
  return (
    <div className="wrap narrow">
      <h1>{t.common.notFound}</h1>
      <p>
        <Link href="/">{t.common.backHome}</Link>
      </p>
    </div>
  );
}
