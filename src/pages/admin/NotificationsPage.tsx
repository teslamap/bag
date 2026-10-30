import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Boxes, CheckCheck, Info, MessageSquare, ShieldCheck, ShoppingBag, Star } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { errorMessage } from '@/lib/errors';
import {
  AdminButton,
  AdminChip,
  AdminEmpty,
  AdminPageHeader,
  AdminPanel,
  AdminSearch,
} from '@/components/admin/AdminUI';
import { formatDateTime, timeAgo } from '@/lib/utils';
import type { AppNotification, NotificationType } from '@/lib/types';

const TYPE_META: Record<NotificationType, { label: string; icon: typeof Bell; tone: string }> = {
  order: { label: 'შეკვეთა', icon: ShoppingBag, tone: 'text-[var(--tone-accent-text)] bg-[#c6aa82]/10 border-[#c6aa82]/25' },
  stock: { label: 'მარაგი', icon: Boxes, tone: 'text-[var(--tone-warning-text)] bg-[#b88a43]/10 border-[#b88a43]/25' },
  system: { label: 'სისტემა', icon: Info, tone: 'text-[var(--tone-info-text)] bg-[#6f96a6]/10 border-[#6f96a6]/25' },
  review: { label: 'მიმოხილვა', icon: Star, tone: 'text-[var(--tone-info-text)] bg-[#7f8fc0]/10 border-[#7f8fc0]/25' },
  account: { label: 'ანგარიში', icon: ShieldCheck, tone: 'text-[var(--tone-success-text)] bg-[#4d7a60]/12 border-[#4d7a60]/25' },
};

function managerLink(link: string | undefined): string | undefined {
  if (!link) return undefined;
  if (!link.startsWith('/admin')) return link;
  if (link.includes('/orders')) return '/manager/orders';
  if (link.includes('/inventory')) return '/manager/inventory';
  if (link.includes('/reviews')) return '/manager/reviews';
  if (link.includes('/products')) return '/manager/products';
  return '/manager/notifications';
}

export function AdminNotificationsPage({ basePath = '/admin' }: { basePath?: string }) {
  const snapshot = useBackendSnapshot();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'unread' | NotificationType>('all');
  const [working, setWorking] = useState(false);

  const userId = snapshot.session?.id ?? '';
  const unread = snapshot.notifications.filter((notification) => !notification.readBy.includes(userId));

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return snapshot.notifications.filter((notification) => {
      if (tab === 'unread' && notification.readBy.includes(userId)) return false;
      if (tab !== 'all' && tab !== 'unread' && notification.type !== tab) return false;
      if (!query) return true;
      return notification.title.toLowerCase().includes(query) || notification.message.toLowerCase().includes(query);
    });
  }, [snapshot.notifications, tab, search, userId]);

  const markAll = async () => {
    setWorking(true);
    try {
      await backend.markAllNotificationsRead();
      toast('ყველა შეტყობინება წაკითხულია', { variant: 'success' });
    } catch (error) {
      toast('ვერ განახლდა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setWorking(false);
    }
  };

  const markOne = async (notification: AppNotification) => {
    if (notification.readBy.includes(userId)) return;
    try {
      await backend.markNotificationRead(notification.id);
    } catch {
      // Non-critical.
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="სისტემა"
        title="შეტყობინებები"
        description={`${unread.length} წაუკითხავი · ${snapshot.notifications.length} საერთო. შეკვეთების, მარაგისა და მოდერაციის ოპერაციული სიგნალები.`}
        actions={<AdminButton variant="secondary" size="sm" loading={working} disabled={!unread.length} leftIcon={<CheckCheck className="h-3.5 w-3.5" aria-hidden />} onClick={() => void markAll()}>ყველას წაკითხვა</AdminButton>}
      />

      <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3 lg:flex-row lg:items-center">
        <AdminSearch value={search} onChange={setSearch} placeholder="ძიება შეტყობინებებში…" className="lg:w-72" />
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
          <AdminChip active={tab === 'all'} onClick={() => setTab('all')} count={snapshot.notifications.length}>ყველა</AdminChip>
          <AdminChip active={tab === 'unread'} onClick={() => setTab('unread')} count={unread.length}>წაუკითხავი</AdminChip>
          {(Object.keys(TYPE_META) as NotificationType[]).map((type) => (
            <AdminChip key={type} active={tab === type} onClick={() => setTab(type)}>
              {TYPE_META[type].label}
            </AdminChip>
          ))}
        </div>
      </div>

      <AdminPanel noPadding>
        <ul className="divide-y divide-[var(--line)]">
          {filtered.map((notification) => {
            const meta = TYPE_META[notification.type];
            const Icon = meta.icon;
            const read = notification.readBy.includes(userId);
            const href = basePath === '/manager' ? managerLink(notification.link) : notification.link;
            const content = (
              <>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${meta.tone}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-[11px] ${read ? 'font-normal text-[var(--text-primary)]' : 'font-medium text-[var(--text-primary)]'}`}>{notification.title}</p>
                    {!read && <span className="h-1.5 w-1.5 rounded-full bg-[#c6aa82]" aria-label="წაუკითხავი" />}
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-secondary)]">{notification.message}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[8px] text-[var(--text-secondary)]">
                    <span>{meta.label}</span>
                    <span>·</span>
                    <span>{timeAgo(notification.createdAt)}</span>
                    <span className="hidden sm:inline">· {formatDateTime(notification.createdAt)}</span>
                  </p>
                </div>
              </>
            );
            return (
              <li key={notification.id} className={read ? '' : 'bg-[#c6aa82]/[0.025]'}>
                {href ? (
                  <Link to={href} onClick={() => void markOne(notification)} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--surface-hover)] sm:px-5">
                    {content}
                  </Link>
                ) : (
                  <button type="button" onClick={() => void markOne(notification)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface-hover)] sm:px-5">
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {!filtered.length && (
          <AdminEmpty
            title={tab === 'unread' ? 'წაუკითხავი შეტყობინება არ არის' : 'შეტყობინებები არ არის'}
            description="ახალი შეკვეთები, მარაგის გაფრთხილებები და მოდერაციის სიგნალები აქ გამოჩნდება."
            icon={<Bell className="h-4 w-4" aria-hidden />}
          />
        )}
      </AdminPanel>

      <p className="flex items-center gap-2 px-1 text-[9px] text-[var(--text-secondary)]">
        <MessageSquare className="h-3 w-3" aria-hidden />
        წაკითხვის სტატუსი ინახება თითოეული მომხმარებლისთვის ცალკე.
      </p>
    </div>
  );
}
