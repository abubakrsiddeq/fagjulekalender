import { getT } from "@/i18n/server";

/** Brand block plus "Powered by Bokonsept AS · Development partner BKR Tech Solutions". */
export async function SiteFooter() {
  const t = await getT();
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer" aria-label={t.footer.label}>
      <div className="inner">
        <div className="footer-brand">
          <span className="footer-symbol">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/symbol.png" alt="" width={44} height={44} />
          </span>
          <span className="stack" style={{ gap: 2 }}>
            <b>{t.appName}</b>
            <span>{t.footer.tagline}</span>
          </span>
        </div>
        <div className="footer-credits">
          <p className="credit">
            <span className="credit-label">{t.footer.poweredBy}</span>
            <span className="logo-chip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/bokonsept.png" alt="Bokonsept AS" width={117} height={40} />
            </span>
          </p>
          <p className="credit">
            <span className="credit-label">{t.footer.partner}</span>
            <span className="logo-chip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/bkr.png" alt="BKR Tech Solutions" width={72} height={32} />
            </span>
          </p>
        </div>
      </div>
      <div className="footer-base">
        <span>
          © {year} Bokonsept AS · {t.footer.rights}
        </span>
        <span className="footer-status">
          <span className="pulse" aria-hidden="true" />
          {t.appName}
        </span>
      </div>
    </footer>
  );
}
