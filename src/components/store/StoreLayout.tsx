import { Outlet, useLocation } from 'react-router-dom';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import { MobileBottomNav } from '@/components/store/MobileBottomNav';
import { CartDrawer } from '@/components/store/CartDrawer';
import { SearchOverlay } from '@/components/store/SearchOverlay';
import { PageTransition } from '@/components/system/Motion';

export function StoreLayout() {
  const location = useLocation();
  return (
    <div className="storefront-theme flex min-h-[100dvh] flex-col bg-ivory text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-[11px] focus:uppercase focus:tracking-widest focus:text-ivory"
      >
        გადასვლა კონტენტზე
      </a>
      <StoreHeader />
      <main id="main-content" className="flex-1 pb-nav md:pb-0">
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
      <StoreFooter />
      <MobileBottomNav />
      <CartDrawer />
      <SearchOverlay />
    </div>
  );
}
