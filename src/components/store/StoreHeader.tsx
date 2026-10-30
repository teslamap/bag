import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, UserRound } from 'lucide-react';
import { BrandMark } from '@/components/ui/BrandMark';
import { Drawer } from '@/components/ui/Feedback';
import { useBackendSnapshot } from '@/state/backend';
import { useCartStore } from '@/state/cart';
import { useUiStore } from '@/state/ui';
import { PUBLIC_NAV } from '@/lib/constants';
import { cn, formatMoney } from '@/lib/utils';
import { Marquee } from '@/components/system/Motion';

export function StoreHeader() {
  const snapshot = useBackendSnapshot();
  const location = useLocation();
  const count = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  const openCart = useCartStore((state) => state.open);
  const openSearch = useUiStore((state) => state.openSearch);
  const mobileMenuOpen = useUiStore((state) => state.mobileMenuOpen);
  const openMobileMenu = useUiStore((state) => state.openMobileMenu);
  const closeMobileMenu = useUiStore((state) => state.closeMobileMenu);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname, closeMobileMenu]);

  const session = snapshot.session;
  const accountPath = !session ? '/auth?mode=login' : session.role === 'admin' ? '/admin' : session.role === 'manager' ? '/manager' : '/account';
  const favoriteCount = session
    ? snapshot.users.find((user) => user.id === session.id)?.favoriteProductIds.length ?? 0
    : 0;

  return (
    <>
      <div className="relative z-10 overflow-hidden bg-ink text-ivory">
        <Marquee className="py-2.5">
          <span className="text-[9px] uppercase tracking-[0.22em] text-ivory/80">{snapshot.settings.announcement}</span>
          <span className="h-1 w-1 rounded-full bg-champagne" aria-hidden />
          <span className="text-[9px] uppercase tracking-[0.22em] text-ivory/80">
            უფასო მიწოდება {formatMoney(snapshot.settings.freeShippingThreshold)}-დან
          </span>
          <span className="h-1 w-1 rounded-full bg-champagne" aria-hidden />
          <span className="text-[9px] uppercase tracking-[0.22em] text-ivory/80">ხელნაკეთი თბილისში · 2018 წლიდან</span>
        </Marquee>
      </div>
      <header
        className={cn(
          'sticky top-0 z-40 border-b transition-all duration-500',
          scrolled
            ? 'border-ink/10 bg-ivory/92 py-2 backdrop-blur-xl'
            : 'border-transparent bg-ivory py-4',
        )}
      >
        <div className="container-editorial flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 lg:hidden">
            <button
              type="button"
              onClick={openMobileMenu}
              aria-label="მენიუს გახსნა"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10"
            >
              <Menu className="h-4.5 w-4.5" aria-hidden />
            </button>
          </div>
          <div className="hidden min-w-[190px] lg:block">
            <BrandMark />
          </div>
          <div className="lg:hidden">
            <BrandMark compact />
          </div>
          <nav className="hidden items-center gap-8 lg:flex" aria-label="მთავარი ნავიგაცია">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'link-underline text-[10px] font-medium uppercase tracking-[0.16em] text-ink/60 transition-colors hover:text-ink',
                    isActive && location.pathname === item.to.split('?')[0] && 'text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex min-w-[190px] items-center justify-end gap-1 sm:gap-2">
            <button
              type="button"
              onClick={openSearch}
              aria-label="ძებნა"
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-ink/[0.05]"
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
            </button>
            <Link
              to={session ? '/account/favorites' : `/auth?mode=login&next=${encodeURIComponent('/account/favorites')}`}
              aria-label={`რჩეულები${favoriteCount ? `, ${favoriteCount} შენახული` : ''}`}
              className="relative hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-ink/[0.05] sm:flex"
            >
              <Heart className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
              {favoriteCount > 0 && (
                <span aria-hidden className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-oxblood px-1 text-[8px] font-medium text-white">
                  {favoriteCount}
                </span>
              )}
            </Link>
            <Link
              to={accountPath}
              aria-label={session ? 'პროფილი' : 'შესვლა'}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-ink/[0.05]"
            >
              <UserRound className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
            </Link>
            <button
              type="button"
              onClick={openCart}
              aria-label={`კალათა${count ? `, ${count} ნივთი` : ''}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-ink/[0.05]"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
              {count > 0 && (
                <span aria-hidden className="absolute right-0 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[8px] font-medium text-ivory">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <Drawer
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        side="left"
        width="max-w-sm"
        title="MAKU"
        eyebrow="ატელიე · თბილისი"
      >
        <nav className="flex flex-col px-5 py-4" aria-label="მობილური ნავიგაცია">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="border-b border-ink/10 py-4 font-display text-3xl font-light tracking-display transition-colors hover:text-earth"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-6">
          <p className="eyebrow mb-4">ანგარიში</p>
          <div className="flex flex-col gap-3">
            <Link to={accountPath} className="text-sm text-ink/70">პროფილი</Link>
            {session ? (
              <Link to="/account/orders" className="text-sm text-ink/70">შეკვეთები</Link>
            ) : (
              <Link to="/auth?mode=register" className="text-sm text-ink/70">რეგისტრაცია</Link>
            )}
            <Link to="/contact" className="text-sm text-ink/70">კონტაქტი</Link>
          </div>
        </div>
        <div className="border-t border-ink/10 px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink/65">
            {snapshot.settings.address}
          </p>
          <p className="mt-2 text-[11px] text-ink/65">
            {snapshot.settings.supportPhone} · {snapshot.settings.supportEmail}
          </p>
        </div>
      </Drawer>
    </>
  );
}
