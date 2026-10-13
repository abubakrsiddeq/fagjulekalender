import Link from "next/link";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="wrap narrow">
      <h1>{t.common.notFound}</h1>
      <p>
        <Link href="/">{t.common.backHome}</Link>
      </p>
    </div>
  );
}
