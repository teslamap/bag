import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Boxes,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Star,
  Store,
  X,
} from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { cn, getFullName, getInitials, timeAgo } from '@/lib/utils';
import {
  canManageInventory,
  canManageOrders,
  canManageProducts,
  canManageReviews,
} from '@/domain/permissions';
import type { StaffPermission } from '@/lib/types';

const TITLES: Record<string, string> = {
  '/manager': 'სამუშაო მაგიდა',
  '/manager/orders': 'შეკვეთები',
  '/manager/products': 'პროდუქტები',
  '/manager/inventory': 'მარაგი',
  '/manager/reviews': 'მიმოხილვები',
  '/manager/notifications': 'შეტყობინებები',
};

function managerNotificationLink(link?: string): string {
  if (!link) return '/manager/notifications';
  if (!link.startsWith('/admin')) return link;
  if (link.includes('/orders')) return '/manager/orders';
  if (link.includes('/products')) return '/manager/products';
  if (link.includes('/inventory')) return '/manager/inventory';
  if (link.includes('/reviews')) return '/manager/reviews';
  return '/manager/notifications';
}

export function ManagerLayout() {
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const session = snapshot.session;
  const role = session?.role ?? 'customer';
  const permissions = session?.permissions ?? [];
  const user = snapshot.users.find((entry) => entry.id === session?.id) ?? null;

  const nav = useMemo(() => {
    const entries: Array<{ to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; permission?: StaffPermission }> = [
      { to: '/manager', label: 'სამუშაო მაგიდა', icon: LayoutDashboard, end: true },
      { to: '/manager/orders', label: 'შეკვეთები', icon: ShoppingBag, permission: 'orders' },
      { to: '/manager/products', label: 'პროდუქტები', icon: Package, permission: 'products' },
      { to: '/manager/inventory', label: 'მარაგი', icon: Boxes, permission: 'inventory' },
      { to: '/manager/reviews', label: 'მიმოხილვები', icon: Star, permission: 'reviews' },
      { to: '/manager/notifications', label: 'შეტყობინებები', icon: Bell },
    ];
    return entries.filter((entry) => {
      if (!entry.permission) return true;
      if (role === 'admin') return true;
      if (entry.permission === 'orders') return canManageOrders(role, permissions);
      if (entry.permission === 'products') return canManageProducts(role, permissions);
      if (entry.permission === 'inventory') return canManageInventory(role, permissions);
      if (entry.permission === 'reviews') return canManageReviews(role, permissions);
      return permissions.includes(entry.permission);
    });
  }, [role, permissions]);

  const unread = snapshot.notifications.filter((notification) => !notification.readBy.includes(session?.id ?? ''));
  const title = useMemo(() => {
    if (location.pathname.startsWith('/manager/orders/')) return 'შეკვეთის დეტალები';
    if (location.pathname.startsWith('/manager/products/')) return 'პროდუქტის რედაქტორი';
    return TITLES[location.pathname] ?? 'სამუშაო სივრცე';
  }, [location.pathname]);

  useEffect(() => {
    setNotificationsOpen(false);
  }, [location.pathname]);

  const logout = async () => {
    await backend.logout();
    toast('გამოხვედით სამუშაო სივრციდან', { variant: 'info' });
    navigate('/auth?mode=login');
  };

  const markRead = async (id: string) => {
    try {
      await backend.markNotificationRead(id);
    } catch {
      // Non-critical.
    }
  };

  return (
    <div className="theme-manager manager-surface min-h-[100dvh]">
      <a href="#manager-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--text-primary)] focus:px-4 focus:py-2 focus:text-[11px] focus:text-[var(--surface)]">
        გადასვლა კონტენტზე
      </a>

      <div className="min-h-[100dvh] lg:grid lg:grid-cols-[236px_1fr]">
        <aside className="sticky top-0 hidden h-[100dvh] border-r border-[var(--line)] bg-[var(--surface-raised)] lg:flex lg:flex-col">
          <div className="flex h-[72px] items-center border-b border-[var(--line)] px-5">
            <Link to="/manager" className="flex items-center gap-3">
              <span aria-hidden className="flex h-9 w-9 items-center justify-center border border-[var(--text-primary)]/20 bg-[var(--text-primary)] font-display text-base text-[var(--surface-raised)]">M</span>
              <span>
                <span className="block font-display text-xl leading-none tracking-[0.16em] text-[var(--text-primary)]">MAKU</span>
                <span className="mt-1 block text-[7px] uppercase tracking-[0.26em] text-[var(--text-secondary)]">Workroom · Tbilisi</span>
              </span>
            </Link>
          </div>

          <div className="border-b border-[var(--line)] px-5 py-4">
            <p className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">ოპერაციული სივრცე</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">შეკვეთები, პროდუქტი და მარაგი — ყოველდღიური რიტმისთვის.</p>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="მენეჯერის ნავიგაცია">
            <ul className="space-y-0.5">
              {nav.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'group flex h-10 items-center gap-3 rounded-lg px-3 text-[11px] transition-colors',
                        isActive
                          ? 'bg-[var(--text-primary)] text-[var(--surface-raised)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.to === '/manager/notifications' && unread.length > 0 && (
                      <span aria-hidden className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b9a17c]/25 px-1 text-[8px] font-medium tabular-nums text-[var(--tone-accent-text)]">{unread.length > 9 ? '9+' : unread.length}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-[var(--line)] p-3">
            <Link to="/" className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[10px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
              <Store className="h-3.5 w-3.5" aria-hidden /> მაღაზიის ნახვა
            </Link>
            <div className="mt-2 flex items-center gap-2.5 rounded-lg px-2.5 py-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--text-primary)] text-[9px] font-medium text-[var(--surface-raised)]">
                {user ? getInitials(user.firstName, user.lastName) : 'M'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-medium text-[var(--text-primary)]">{user ? getFullName(user) : 'მენეჯერი'}</p>
                <p className="truncate text-[8px] text-[var(--text-secondary)]">მენეჯერი · შეზღუდული წვდომა</p>
              </div>
              <button type="button" onClick={() => void logout()} aria-label="გასვლა" className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[#8f3f3f]">
                <LogOut className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]/92 backdrop-blur-md">
            <div className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center bg-[var(--text-primary)] font-display text-sm text-[var(--surface-raised)] lg:hidden">M</span>
                <div className="min-w-0">
                  <p className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">MAKU · Workroom</p>
                  <p className="truncate text-[12px] font-medium text-[var(--text-primary)]">{title}</p>
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  aria-label={`შეტყობინებები${unread.length ? `, წაუკითხავი ${unread.length > 9 ? '9+' : unread.length}` : ''}`}
                  aria-expanded={notificationsOpen}
                >
                  <Bell className="h-4 w-4" aria-hidden />
                  {unread.length > 0 && <span aria-hidden className="absolute right-1 top-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-[#6f5b36] px-0.5 text-[7px] font-semibold text-[#fffdf8]">{unread.length > 9 ? '9+' : unread.length}</span>}
                </button>
                <AnimatePresence>
                  {notificationsOpen && (
                    <>
                      <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="დახურვა" onClick={() => setNotificationsOpen(false)} tabIndex={-1} />
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-10 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--line-strong)] bg-[var(--surface-elevated)] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
                          <p className="text-[11px] font-medium">შეტყობინებები</p>
                          <button type="button" onClick={() => void backend.markAllNotificationsRead()} className="text-[8px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">ყველას წაკითხვა</button>
                        </div>
                        <ul className="max-h-80 overflow-y-auto">
                          {snapshot.notifications.slice(0, 8).map((notification) => (
                            <li key={notification.id} className="border-b border-[var(--line)] last:border-0">
                              <Link
                                to={managerNotificationLink(notification.link)}
                                onClick={() => { void markRead(notification.id); setNotificationsOpen(false); }}
                                className="block px-4 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                              >
                                <div className="flex items-start gap-2">
                                  {!notification.readBy.includes(session?.id ?? '') && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8d7950]" aria-hidden />}
                                  <div className="min-w-0">
                                    <p className="truncate text-[10px] font-medium">{notification.title}</p>
                                    <p className="mt-0.5 line-clamp-2 text-[9px] leading-relaxed text-[var(--text-secondary)]">{notification.message}</p>
                                    <p className="mt-1 text-[8px] text-[var(--text-secondary)]">{timeAgo(notification.createdAt)}</p>
                                  </div>
                                </div>
                              </Link>
                            </li>
                          ))}
                          {!snapshot.notifications.length && <li className="px-4 py-8 text-center text-[10px] text-[var(--text-secondary)]">შეტყობინებები არ არის.</li>}
                        </ul>
                        <Link to="/manager/notifications" className="flex items-center justify-center gap-1.5 border-t border-[var(--line)] px-4 py-2.5 text-[9px] uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                          ყველა შეტყობინება <ChevronRight className="h-3 w-3" aria-hidden />
                        </Link>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="hidden items-center gap-2 border-l border-[var(--line)] pl-3 sm:flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--text-primary)] text-[8px] font-medium text-[var(--surface-raised)]">{user ? getInitials(user.firstName, user.lastName) : 'M'}</span>
                <span className="max-w-28 truncate text-[10px] text-[var(--text-primary)]">{user ? getFullName(user) : 'მენეჯერი'}</span>
              </div>
            </div>

            <div className="hide-scrollbar flex gap-1 overflow-x-auto border-t border-[var(--line)] px-3 py-2 lg:hidden">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] transition-colors',
                      isActive ? 'bg-[var(--text-primary)] text-[var(--surface-raised)]' : 'border border-[var(--line)] text-[var(--text-secondary)]',
                    )
                  }
                >
                  <item.icon className="h-3 w-3" aria-hidden /> {item.label}
                </NavLink>
              ))}
            </div>
          </header>

          <main id="manager-content" className="min-w-0 flex-1 px-3 py-5 pb-24 sm:px-6 sm:py-6 lg:pb-10">
            <Outlet />
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[var(--line)] bg-[var(--surface-raised)]/96 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" aria-label="მობილური ნავიგაცია">
            {nav.filter((item) => ['/manager', '/manager/orders', '/manager/products', '/manager/inventory', '/manager/notifications'].includes(item.to)).slice(0, 5).map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2 text-[8px]', isActive ? 'text-[var(--tone-accent-text)]' : 'text-[var(--text-secondary)]')}>
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

export function ManagerMasthead({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const today = new Intl.DateTimeFormat('ka-GE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return (
    <div className="border-b border-[var(--line)] pb-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-[var(--text-secondary)]">{eyebrow} · {today}</p>
          <h1 className="mt-2 font-display text-[32px] font-light leading-none tracking-[-0.02em] text-[var(--text-primary)] md:text-[40px]">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-[var(--text-secondary)]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function ManagerPermissionGate({ children, allowed }: { children: React.ReactNode; allowed: boolean }) {
  if (allowed) return <>{children}</>;
  return (
    <div className="admin-card flex flex-col items-center gap-3 p-10 text-center">
      <ClipboardList className="h-6 w-6 text-[var(--tone-accent-text)]" aria-hidden />
      <p className="font-display text-2xl text-[var(--text-primary)]">წვდომა შეზღუდულია</p>
      <p className="max-w-md text-[10px] leading-relaxed text-[var(--text-secondary)]">ამ განყოფილებაზე წვდომა არ გაქვთ. მიმართეთ ადმინისტრატორს.</p>
      <Link to="/manager" className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]">სამუშაო მაგიდაზე დაბრუნება</Link>
    </div>
  );
}
