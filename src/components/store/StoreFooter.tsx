import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { BrandMark } from '@/components/ui/BrandMark';
import { useBackendSnapshot } from '@/state/backend';
import { FOOTER_LINKS } from '@/lib/constants';

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden>
      <path d="M14.5 8.5h2.2V5.3h-2.6c-2.4 0-4 1.6-4 4.1v2.1H7.7v3.2H10V21h3.3v-6.3h2.8l.5-3.2h-3.3V9.7c0-.8.4-1.2 1.2-1.2Z" />
    </svg>
  );
}

export function StoreFooter() {
  const { settings } = useBackendSnapshot();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-ink/10 bg-ivory">
      <div className="container-editorial py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <BrandMark />
            <p className="mt-6 max-w-md font-display text-3xl font-light leading-tight tracking-display md:text-4xl">
              {settings.tagline}
            </p>
            <p className="mt-5 max-w-sm text-[12px] leading-relaxed text-ink/65">
              {settings.address}<br />
              {settings.supportPhone} · {settings.supportEmail}
            </p>
            <div className="mt-7 flex items-center gap-3">
              {settings.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 transition-colors hover:border-ink/40"
                >
                  <InstagramIcon className="h-4 w-4" />
                </a>
              )}
              {settings.facebookUrl && (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 transition-colors hover:border-ink/40"
                >
                  <FacebookIcon className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h3 className="eyebrow mb-4">მაღაზია</h3>
              <ul className="space-y-2.5">
                {FOOTER_LINKS.shop.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-[12px] text-ink/65 transition-colors hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="eyebrow mb-4">მომსახურება</h3>
              <ul className="space-y-2.5">
                {FOOTER_LINKS.care.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-[12px] text-ink/65 transition-colors hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="eyebrow mb-4">სამართალი</h3>
              <ul className="space-y-2.5">
                {FOOTER_LINKS.legal.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-[12px] text-ink/65 transition-colors hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/auth?mode=login" className="inline-flex items-center gap-1 text-[12px] text-ink/65 transition-colors hover:text-ink">
                    თანამშრომლის შესვლა <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t border-ink/10 pt-6 text-[9px] uppercase tracking-[0.16em] text-ink/65 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} MAKU · ყველა უფლება დაცულია</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <span>გადახდა მიღებისას</span>
            <span>ადგილობრივი წარმოება</span>
            <span>თბილისი, საქართველო</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
