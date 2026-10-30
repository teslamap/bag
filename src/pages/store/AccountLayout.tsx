import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  UserRound,
} from 'lucide-react';
import { useBackendSnapshot, useCurrentUser } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Seo } from '@/components/system/Seo';

const links = [
  { to: '/account', label: 'მიმოხილვა', icon: LayoutDashboard, end: true },
  { to: '/account/orders', label: 'შეკვეთები', icon: Package },
  { to: '/account/favorites', label: 'რჩეულები', icon: Heart },
  { to: '/account/addresses', label: 'მისამართები', icon: MapPin },
  { to: '/account/notifications', label: 'შეტყობინებები', icon: Bell },
  { to: '/account/profile', label: 'პროფილი', icon: UserRound },
];

export function AccountLayout() {
  const snapshot = useBackendSnapshot();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const unread = snapshot.notifications.filter((notification) => !snapshot.session || !notification.readBy.includes(snapshot.session.id)).length;

  const logout = async () => {
    await backend.logout();
    toast('გამოხვედით სისტემიდან', { variant: 'info' });
    navigate('/');
  };

  return (
    <div className="container-editorial py-10 md:py-14">
      <Seo title="ჩემი ანგარიში" noIndex />
      <div className="grid gap-10 lg:grid-cols-[260px_1fr] lg:gap-14">
        <aside>
          <div className="border border-ink/10 p-5">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink font-display text-lg text-ivory">
                {user ? getInitials(user.firstName, user.lastName) : 'M'}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-xl">{user ? `${user.firstName} ${user.lastName}` : 'სტუმარი'}</p>
                <p className="mt-0.5 truncate text-[10px] text-ink/65">{user?.email}</p>
              </div>
            </div>
          </div>
          <nav className="mt-4 flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label="ანგარიშის ნავიგაცია">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-3 whitespace-nowrap px-3 py-3 text-[11px] transition-colors lg:w-full',
                    isActive ? 'bg-ink text-ivory' : 'text-ink/65 hover:bg-ink/[0.04] hover:text-ink',
                  )
                }
              >
                <link.icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                {link.label}
                {link.to === '/account/notifications' && unread > 0 && (
                  <span className="ml-auto hidden h-4 min-w-4 items-center justify-center rounded-full bg-champagne px-1 text-[8px] font-medium text-ink lg:flex">
                    {unread}
                  </span>
                )}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => void logout()}
              className="flex shrink-0 items-center gap-3 whitespace-nowrap px-3 py-3 text-[11px] text-ink/65 transition-colors hover:text-[#8f3f3f] lg:w-full"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              გასვლა
            </button>
          </nav>
          <div className="mt-6 hidden border-t border-ink/10 pt-5 lg:block">
            <p className="text-[9px] uppercase tracking-[0.14em] text-ink/65">დახმარება</p>
            <a href="mailto:hello@maku.ge" className="mt-2 block text-[11px] text-ink/65 hover:text-ink">hello@maku.ge</a>
            <p className="mt-1 text-[11px] text-ink/65">+995 322 50 18 18</p>
          </div>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
