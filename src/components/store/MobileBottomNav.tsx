import { NavLink, useLocation } from 'react-router-dom';
import { Heart, Home, Search, ShoppingBag, UserRound } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { useCartStore } from '@/state/cart';
import { useUiStore } from '@/state/ui';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const snapshot = useBackendSnapshot();
  const location = useLocation();
  const count = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  const openCart = useCartStore((state) => state.open);
  const openSearch = useUiStore((state) => state.openSearch);
  const session = snapshot.session;
  const auth = snapshot.authReady;

  const contentPages = ['/checkout', '/auth'];
  if (contentPages.some((path) => location.pathname.startsWith(path))) return null;

  const item = (active: boolean) =>
    cn(
      'flex flex-col items-center gap-1 px-2 py-2 text-[8px] uppercase tracking-[0.12em] transition-colors',
      active ? 'text-ink' : 'text-ink/65',
    );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-ivory/95 pb-safe backdrop-blur-xl md:hidden"
      aria-label="მობილური ნავიგაცია"
    >
      <div className="grid grid-cols-5">
        <NavLink to="/" className={({ isActive }) => item(isActive)}>
          <Home className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
          მთავარი
        </NavLink>
        <NavLink to="/catalog" className={({ isActive }) => item(isActive)}>
          <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
          მაღაზია
        </NavLink>
        <button type="button" onClick={openSearch} className={item(false)} aria-label="ძებნა">
          <Search className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
          ძებნა
        </button>
        <NavLink
          to={session ? '/account/favorites' : `/auth?mode=login&next=${encodeURIComponent('/account/favorites')}`}
          className={({ isActive }) => item(isActive)}
        >
          <Heart className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
          რჩეული
        </NavLink>
        {auth && session ? (
          <NavLink
            to={session.role === 'admin' ? '/admin' : session.role === 'manager' ? '/manager' : '/account'}
            className={({ isActive }) => item(isActive)}
          >
            <UserRound className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
            პროფილი
          </NavLink>
        ) : (
          <NavLink to="/auth?mode=login" className={({ isActive }) => item(isActive)}>
            <UserRound className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
            შესვლა
          </NavLink>
        )}
      </div>
      <button type="button" onClick={openCart} className="sr-only" aria-label="კალათის გახსნა">
        კალათა {count}
      </button>
    </nav>
  );
}
