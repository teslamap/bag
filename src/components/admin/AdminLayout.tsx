import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  Moon,
  Package,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  ScrollText,
  Sun,
  Tag,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAdminStore } from '@/state/admin';
import { useBackendSnapshot, useCurrentUser } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { cn, getFullName, getInitials, timeAgo } from '@/lib/utils';
import { AdminChip, AdminInput, AdminSearch } from '@/components/admin/AdminUI';

interface AdminNavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  badge?: 'orders' | 'stock' | 'reviews' | 'notifications';
  adminOnly?: boolean;
}

const groups: Array<{ label: string; items: AdminNavItem[] }> = [
  {
    label: 'მიმოხილვა',
    items: [{ to: '/admin', label: 'დაშბორდი', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'კომერცია',
    items: [
      { to: '/admin/orders', label: 'შეკვეთები', icon: ShoppingBag, badge: 'orders' as const },
      { to: '/admin/products', label: 'პროდუქტები', icon: Package },
      { to: '/admin/inventory', label: 'მარაგი', icon: Boxes, badge: 'stock' as const },
      { to: '/admin/promotions', label: 'პრომოკოდები', icon: Tag },
      { to: '/admin/reviews', label: 'მიმოხილვები', icon: Star, badge: 'reviews' as const },
      { to: '/admin/categories', label: 'Categories', icon: List, adminOnly: true },
    ],
  },
  {
    label: 'ადამიანები',
    items: [
      { to: '/admin/customers', label: 'მომხმარებლები', icon: Users },
      { to: '/admin/employees', label: 'თანამშრომლები', icon: UserCog },
    ],
  },
  {
    label: 'სისტემა',
    items: [
      { to: '/admin/notifications', label: 'შეტყობინებები', icon: Bell, badge: 'notifications' as const },
      { to: '/admin/audit', label: 'აუდიტის ჟურნალი', icon: ScrollText },
      { to: '/admin/settings', label: 'პარამეტრები', icon: Settings },
    ],
  },
] as const;

const BREADCRUMBS: Record<string, string> = {
  '/admin': 'დაშბორდი',
  '/admin/orders': 'შეკვეთები',
  '/admin/products': 'პროდუქტები',
  '/admin/products/new': 'ახალი პროდუქტი',
  '/admin/inventory': 'მარაგი',
  '/admin/promotions': 'პრომოკოდები',
  '/admin/reviews': 'მიმოხილვები',
  '/admin/customers': 'მომხმარებლები',
  '/admin/employees': 'თანამშრომლები',
  '/admin/notifications': 'შეტყობინებები',
  '/admin/audit': 'აუდიტის ჟურნალი',
  '/admin/categories': 'Categories',
  '/admin/settings': 'პარამეტრები',
};

function useAdminTheme() {
  const theme = useAdminStore((state) => state.theme);
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme === 'dark' ? '#0e0f0f' : '#f5f2ec');
  }, [theme]);
  return theme;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const snapshot = useBackendSnapshot();
  const location = useLocation();
  const collapsed = useAdminStore((state) => state.sidebarCollapsed);
  const user = useCurrentUser();

  const counts = {
    orders: snapshot.orders.filter((order) => order.status === 'new').length,
    stock: snapshot.products.filter((product) => product.status === 'active' && product.stock <= product.lowStockThreshold).length,
    reviews: snapshot.reviews.filter((review) => review.status === 'pending').length,
    notifications: snapshot.notifications.filter((notification) => snapshot.session && !notification.readBy.includes(snapshot.session.id)).length,
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn('flex h-16 shrink-0 items-center border-b border-[var(--line)] px-4', collapsed && 'justify-center px-2')}>
        <Link to="/admin" className="flex items-center gap-2.5">
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#c6aa82]/40 bg-[#c6aa82]/10 font-display text-sm tracking-[0.16em] text-[var(--tone-accent-text)]">
            M
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block font-display text-lg leading-none tracking-[0.18em] text-[var(--text-primary)]">MAKU</span>
              <span className="mt-1 block text-[7px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">Admin Console</span>
            </span>
          )}
          {collapsed && <span className="sr-only">MAKU Admin Console — დაშბორდი</span>}
        </Link>
      </div>

      <nav className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 py-4" aria-label="ადმინისტრირების ნავიგაცია">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            {!collapsed && <p className="mb-1.5 px-2.5 text-[7px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">{group.label}</p>}
            <ul className="space-y-0.5">
              {group.items.filter((item) => !(item.adminOnly && user?.role !== 'admin')).map((item) => {
                const badge = 'badge' in item && item.badge ? counts[item.badge] : 0;
                const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={'end' in item ? item.end : false}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[11px] transition-colors',
                        active
                          ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
                        collapsed && 'justify-center px-0',
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} aria-hidden />
                      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                      {!collapsed && badge > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c6aa82]/20 px-1 text-[8px] font-medium tabular-nums text-[var(--tone-accent-text)]">
                          {badge}
                        </span>
                      )}
                      {collapsed && badge > 0 && <span className="absolute ml-6 mt-[-10px] h-1.5 w-1.5 rounded-full bg-[#c6aa82]" aria-hidden />}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-[var(--line)] p-2.5">
        <Link
          to="/"
          className={cn('flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[10px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]', collapsed && 'justify-center px-0')}
          title="მაღაზიის ნახვა"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {!collapsed && <span>მაღაზიის ნახვა</span>}
        </Link>
        <div className={cn('mt-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2', collapsed && 'justify-center px-0')}>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c6aa82]/15 text-[8px] font-medium text-[var(--tone-accent-text)]">
            {user ? getInitials(user.firstName, user.lastName) : 'A'}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[10px] text-[var(--text-primary)]">{user ? getFullName(user) : 'ადმინისტრატორი'}</p>
              <p className="truncate text-[8px] text-[var(--text-secondary)]">ადმინისტრატორი</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const theme = useAdminTheme();
  const collapsed = useAdminStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAdminStore((state) => state.toggleSidebar);
  const toggleTheme = useAdminStore((state) => state.toggleTheme);
  const mobileNavOpen = useAdminStore((state) => state.mobileNavOpen);
  const setMobileNav = useAdminStore((state) => state.setMobileNav);
  const snapshot = useBackendSnapshot();
  const user = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  const unread = snapshot.notifications.filter((notification) => snapshot.session && !notification.readBy.includes(snapshot.session.id));
  const currentLabel = useMemo(() => {
    if (BREADCRUMBS[location.pathname]) return BREADCRUMBS[location.pathname];
    if (location.pathname.startsWith('/admin/orders/')) return 'შეკვეთის დეტალები';
    if (location.pathname.startsWith('/admin/products/')) return 'პროდუქტის რედაქტორი';
    return 'ადმინისტრირება';
  }, [location.pathname]);

  const quickResults = useMemo(() => {
    if (!search.trim()) return [];
    const query = search.trim().toLowerCase();
    const nav = groups.flatMap((group) => group.items).filter((item) => item.label.toLowerCase().includes(query)).slice(0, 4);
    const orders = snapshot.orders
      .filter((order) => order.number.toLowerCase().includes(query) || `${order.customer.firstName} ${order.customer.lastName}`.toLowerCase().includes(query))
      .slice(0, 4);
    const products = snapshot.products.filter((product) => product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)).slice(0, 4);
    return [
      ...nav.map((item) => ({ type: 'ნავიგაცია', label: item.label, to: item.to })),
      ...orders.map((order) => ({ type: 'შეკვეთა', label: `${order.number} · ${order.customer.firstName} ${order.customer.lastName}`, to: `/admin/orders/${order.id}` })),
      ...products.map((product) => ({ type: 'პროდუქტი', label: `${product.name} · ${product.sku}`, to: `/admin/products/${product.id}/edit` })),
    ];
  }, [search, snapshot.orders, snapshot.products]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const logout = async () => {
    await backend.logout();
    toast('გამოხვედით ადმინისტრირებიდან', { variant: 'info' });
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
    <div className={cn('min-h-[100dvh] bg-[var(--surface)] text-[var(--text-primary)]', theme === 'dark' ? 'theme-admin-dark' : 'theme-admin-light')}>
      <a href="#admin-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--text-primary)] focus:px-4 focus:py-2 focus:text-[11px] focus:text-[var(--surface)]">
        გადასვლა კონტენტზე
      </a>

      <div className={cn('grid min-h-[100dvh] transition-[grid-template-columns] duration-300', collapsed ? 'lg:grid-cols-[68px_1fr]' : 'lg:grid-cols-[244px_1fr]')}>
        <aside className="sticky top-0 hidden h-[100dvh] border-r border-[var(--line)] bg-[var(--surface-raised)] lg:block">
          <SidebarContent />
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'გვერდითი პანელის გაშლა' : 'გვერდითი პანელის ჩაკეცვა'}
            className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            {collapsed ? <ChevronRight className="h-3 w-3" aria-hidden /> : <ChevronLeft className="h-3 w-3" aria-hidden />}
          </button>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)]/90 px-3 backdrop-blur-md sm:h-16 sm:px-5">
            <button type="button" onClick={() => setMobileNav(true)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] lg:hidden" aria-label="მენიუს გახსნა">
              <Menu className="h-4 w-4" aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <p className="hidden text-[9px] uppercase tracking-[0.16em] text-[var(--text-secondary)] sm:block">MAKU · ადმინისტრირება</p>
              <p className="truncate text-[12px] font-medium text-[var(--text-primary)]">{currentLabel}</p>
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden h-8 items-center gap-2 rounded-lg border border-[var(--line)] px-2.5 text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text-primary)] sm:flex"
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
              <span>ძიება</span>
              <kbd className="ml-4 rounded border border-[var(--line)] px-1 py-0.5 font-sans text-[8px]">⌘K</kbd>
            </button>

            <div className="relative">
              <button type="button" onClick={() => { setNotificationsOpen((open) => !open); setUserMenuOpen(false); }} className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]" aria-label={`შეტყობინებები${unread.length ? `, წაუკითხავი ${unread.length > 9 ? '9+' : unread.length}` : ''}`} aria-expanded={notificationsOpen}>
                <Bell className="h-4 w-4" aria-hidden />
                {unread.length > 0 && <span aria-hidden className="absolute right-1 top-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-[#c6aa82] px-0.5 text-[7px] font-semibold text-[#171717]">{unread.length > 9 ? '9+' : unread.length}</span>}
              </button>
              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="დახურვა" onClick={() => setNotificationsOpen(false)} tabIndex={-1} />
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute right-0 top-10 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--line-strong)] bg-[var(--surface-elevated)] shadow-2xl">
                      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
                        <p className="text-[11px] font-medium">შეტყობინებები</p>
                        <button type="button" onClick={() => void backend.markAllNotificationsRead()} className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">ყველას წაკითხვა</button>
                      </div>
                      <ul className="max-h-80 overflow-y-auto">
                        {snapshot.notifications.slice(0, 8).map((notification) => (
                          <li key={notification.id} className="border-b border-[var(--line)] last:border-0">
                            <Link
                              to={notification.link && notification.link.startsWith('/admin') ? notification.link : '/admin/notifications'}
                              onClick={() => { void markRead(notification.id); setNotificationsOpen(false); }}
                              className="block px-4 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                            >
                              <div className="flex items-start gap-2">
                                {!notification.readBy.includes(snapshot.session?.id ?? '') && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c6aa82]" aria-hidden />}
                                <div className={cn('min-w-0', notification.readBy.includes(snapshot.session?.id ?? '') && 'pl-3.5')}>
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
                      <Link to="/admin/notifications" onClick={() => setNotificationsOpen(false)} className="flex items-center justify-center gap-1.5 border-t border-[var(--line)] px-4 py-2.5 text-[9px] uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        ყველა შეტყობინება <ChevronRight className="h-3 w-3" aria-hidden />
                      </Link>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button type="button" onClick={toggleTheme} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]" aria-label={theme === 'dark' ? 'ღია თემა' : 'მუქი თემა'}>
              {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
            </button>

            <div className="relative">
              <button type="button" onClick={() => { setUserMenuOpen((open) => !open); setNotificationsOpen(false); }} className="flex h-8 items-center gap-2 rounded-lg px-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]" aria-expanded={userMenuOpen}>
                <span className="sr-only">მომხმარებლის მენიუ — </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c6aa82]/15 text-[8px] font-medium text-[var(--tone-accent-text)]">{user ? getInitials(user.firstName, user.lastName) : 'A'}</span>
                <span className="hidden max-w-24 truncate text-[10px] text-[var(--text-primary)] md:block">{user ? getFullName(user) : 'ადმინი'}</span>
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="დახურვა" onClick={() => setUserMenuOpen(false)} tabIndex={-1} />
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-xl border border-[var(--line-strong)] bg-[var(--surface-elevated)] py-1.5 shadow-2xl">
                      <div className="border-b border-[var(--line)] px-3 py-2">
                        <p className="truncate text-[10px] font-medium">{user ? getFullName(user) : 'ადმინისტრატორი'}</p>
                        <p className="mt-0.5 truncate text-[9px] text-[var(--text-secondary)]">{user?.email}</p>
                      </div>
                      <Link to="/" className="flex items-center gap-2 px-3 py-2 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"><ShoppingBag className="h-3.5 w-3.5" aria-hidden /> მაღაზია</Link>
                      <Link to="/admin/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"><Settings className="h-3.5 w-3.5" aria-hidden /> პარამეტრები</Link>
                      <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] text-[var(--tone-danger-text)] hover:bg-[var(--surface-hover)]"><LogOut className="h-3.5 w-3.5" aria-hidden /> გასვლა</button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </header>

          <main id="admin-content" className="min-w-0 flex-1 px-3 py-5 pb-24 sm:px-5 sm:py-6 lg:pb-8">
            <Outlet />
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[var(--line)] bg-[var(--surface-raised)]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" aria-label="მობილური ადმინისტრირება">
            {[
              { to: '/admin', label: 'დაშბორდი', icon: LayoutDashboard, end: true },
              { to: '/admin/orders', label: 'შეკვეთები', icon: ShoppingBag },
              { to: '/admin/products', label: 'პროდუქტები', icon: Package },
              { to: '/admin/inventory', label: 'მარაგი', icon: Boxes },
            ].map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2 text-[8px]', isActive ? 'text-[var(--tone-accent-text)]' : 'text-[var(--text-secondary)]')}>
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </NavLink>
            ))}
            <button type="button" onClick={() => setMobileNav(true)} className="flex flex-1 flex-col items-center gap-1 py-2 text-[8px] text-[var(--text-secondary)]">
              <Menu className="h-4 w-4" aria-hidden />
              მეტი
            </button>
          </nav>
        </div>
      </div>

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div className="fixed inset-0 z-[90] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="დახურვა" className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setMobileNav(false)} tabIndex={-1} />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-y-0 left-0 w-[280px] border-r border-[var(--line)] bg-[var(--surface-raised)]">
              <button type="button" onClick={() => setMobileNav(false)} aria-label="დახურვა" className="absolute right-3 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <X className="h-4 w-4" aria-hidden />
              </button>
              <SidebarContent onNavigate={() => setMobileNav(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen && (
          <motion.div className="fixed inset-0 z-[110] flex items-start justify-center px-4 pt-[10vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="დახურვა" className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => { setSearchOpen(false); setSearch(''); }} tabIndex={-1} />
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="relative w-full max-w-xl overflow-hidden rounded-xl border border-[var(--line-strong)] bg-[var(--surface-elevated)] shadow-2xl">
              <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
                <Search className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden />
                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="მოძებნეთ გვერდი, შეკვეთა ან პროდუქტი…"
                  className="w-full bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                  aria-label="გლობალური ძიება"
                />
                <kbd className="rounded border border-[var(--line)] px-1.5 py-0.5 text-[8px] text-[var(--text-secondary)]">ESC</kbd>
              </div>
              <ul className="max-h-80 overflow-y-auto py-2">
                {quickResults.map((result) => (
                  <li key={`${result.type}-${result.to}`}>
                    <Link to={result.to} onClick={() => { setSearchOpen(false); setSearch(''); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-hover)]">
                      <span className="w-20 shrink-0 text-[8px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{result.type}</span>
                      <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-primary)]">{result.label}</span>
                      <ChevronRight className="h-3 w-3 text-[var(--text-secondary)]" aria-hidden />
                    </Link>
                  </li>
                ))}
                {search.trim() && !quickResults.length && <li className="px-4 py-8 text-center text-[10px] text-[var(--text-secondary)]">შედეგი ვერ მოიძებნა.</li>}
                {!search.trim() && <li className="px-4 py-6 text-center text-[10px] text-[var(--text-secondary)]">დაიწყეთ აკრეფა — მოძებნეთ შეკვეთის ნომერი, პროდუქტი ან გვერდი.</li>}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
