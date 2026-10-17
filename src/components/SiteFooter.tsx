import { getT } from "@/i18n/server";

/** "Powered by Bokonsept AS · Development partner BKR Tech Solutions". */
export async function SiteFooter() {
  const t = await getT();
  return (
    <footer className="site-footer" aria-label={t.footer.label}>
      <div className="inner">
        <p className="credit">
          <span>{t.footer.poweredBy}</span>
          <span className="logo-chip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/bokonsept.png" alt="Bokonsept AS" width={117} height={40} />
          </span>
        </p>
        <p className="credit">
          <span>{t.footer.partner}</span>
          <span className="logo-chip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/bkr.png" alt="BKR Tech Solutions" width={72} height={32} />
          </span>
        </p>
      </div>
    </footer>
  );
}
