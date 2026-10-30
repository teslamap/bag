import { useMemo, useState } from 'react';
import { Download, Mail, MapPin, Phone, SearchX, ShieldCheck, UserRound, Users } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { errorMessage } from '@/lib/errors';
import {
  AdminButton,
  AdminChip,
  AdminEmpty,
  AdminModal,
  AdminPageHeader,
  AdminPanel,
  AdminSearch,
  AdminStat,
  MoneyText,
  Pagination,
  TableWrap,
} from '@/components/admin/AdminUI';
import { downloadCsv, formatDate, formatMoney, getFullName, getInitials } from '@/lib/utils';
import type { User } from '@/lib/types';

const ROLE_LABELS = { customer: 'მომხმარებელი', manager: 'მენეჯერი', admin: 'ადმინისტრატორი' };

export function AdminCustomersPage() {
  const snapshot = useBackendSnapshot();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [sort, setSort] = useState<'newest' | 'spend' | 'orders' | 'name'>('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [updating, setUpdating] = useState(false);
  const pageSize = 12;

  const customerStats = useMemo(() => {
    const map = new Map<string, { orders: number; spent: number; lastOrder?: string; cancelled: number }>();
    for (const order of snapshot.orders) {
      const entry = map.get(order.userId) ?? { orders: 0, spent: 0, cancelled: 0 };
      if (order.status !== 'cancelled') {
        entry.orders += 1;
        entry.spent += order.total;
      } else {
        entry.cancelled += 1;
      }
      if (!entry.lastOrder || new Date(order.createdAt).getTime() > new Date(entry.lastOrder).getTime()) entry.lastOrder = order.createdAt;
      map.set(order.userId, entry);
    }
    return map;
  }, [snapshot.orders]);

  const customers = snapshot.users.filter((user) => user.role === 'customer');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = customers.filter((user) => {
      if (status !== 'all' && user.status !== status) return false;
      if (!query) return true;
      return (
        getFullName(user).toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone.toLowerCase().includes(query) ||
        user.addresses.some((address) => `${address.city} ${address.street}`.toLowerCase().includes(query))
      );
    });
    return [...list].sort((a, b) => {
      const aStats = customerStats.get(a.id);
      const bStats = customerStats.get(b.id);
      switch (sort) {
        case 'spend':
          return (bStats?.spent ?? 0) - (aStats?.spent ?? 0);
        case 'orders':
          return (bStats?.orders ?? 0) - (aStats?.orders ?? 0);
        case 'name':
          return getFullName(a).localeCompare(getFullName(b));
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [customers, search, status, sort, customerStats]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totalSpend = [...customerStats.values()].reduce((total, entry) => total + entry.spent, 0);
  const repeat = [...customerStats.values()].filter((entry) => entry.orders > 1).length;

  const changeStatus = async () => {
    if (!confirmUser) return;
    setUpdating(true);
    try {
      const next = confirmUser.status === 'active' ? 'suspended' : 'active';
      await backend.setUserStatus(confirmUser.id, next);
      toast(next === 'suspended' ? 'ანგარიში შეჩერდა' : 'ანგარიში აღდგა', { message: getFullName(confirmUser) });
      setConfirmUser(null);
      setSelected(null);
    } catch (error) {
      toast('ვერ შეიცვალა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      'maku-customers.csv',
      ['ID', 'სახელი', 'ელფოსტა', 'ტელეფონი', 'სტატუსი', 'შეკვეთები', 'დახარჯული (₾)', 'რეგისტრაცია'],
      filtered.map((user) => {
        const stats = customerStats.get(user.id);
        return [user.id, getFullName(user), user.email, user.phone, user.status, stats?.orders ?? 0, ((stats?.spent ?? 0)).toFixed(2), user.createdAt];
      }),
    );
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="ადამიანები"
        title="მომხმარებლები"
        description="მომხმარებლების პროფილები, შეკვეთების ისტორია და ანგარიშის სტატუსი. პერსონალური მონაცემები დაცულია როლებით."
        actions={<AdminButton variant="secondary" size="sm" leftIcon={<Download className="h-3.5 w-3.5" aria-hidden />} onClick={exportCsv}>CSV</AdminButton>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="მომხმარებლები" value={customers.length} sub={`${customers.filter((user) => user.status === 'active').length} აქტიური`} icon={<Users className="h-4 w-4" aria-hidden />} />
        <AdminStat label="შეჩერებული" value={customers.filter((user) => user.status === 'suspended').length} sub="ხელით გადასამოწმებელი" icon={<ShieldCheck className="h-4 w-4" aria-hidden />} accent="warning" />
        <AdminStat label="მთლიანი დახარჯვა" value={formatMoney(totalSpend)} sub="გაუქმებულის გარეშე" icon={<MoneyText value={0} />} accent="success" />
        <AdminStat label="განმეორებითი" value={repeat} sub="1-ზე მეტი შეკვეთა" />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3 sm:flex-row sm:items-center">
        <AdminSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="სახელი, ელფოსტა, ტელეფონი, ქალაქი…" className="sm:w-80" />
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
          {(['all', 'active', 'suspended'] as const).map((entry) => (
            <AdminChip key={entry} active={status === entry} onClick={() => { setStatus(entry); setPage(1); }} count={entry === 'all' ? customers.length : customers.filter((user) => user.status === entry).length}>
              {entry === 'all' ? 'ყველა' : entry === 'active' ? 'აქტიური' : 'შეჩერებული'}
            </AdminChip>
          ))}
        </div>
        <div className="flex flex-1 justify-end">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="admin-input h-8 w-auto min-w-32 py-0 text-[10px]"
            aria-label="სორტირება"
          >
            <option value="newest">უახლესი</option>
            <option value="spend">დახარჯვა ↓</option>
            <option value="orders">შეკვეთები ↓</option>
            <option value="name">სახელი</option>
          </select>
        </div>
      </div>

      <AdminPanel noPadding>
        <div className="hidden lg:block">
          <TableWrap>
            <table className="admin-table w-full min-w-[840px]">
              <thead><tr><th>მომხმარებელი</th><th>კონტაქტი</th><th>ქალაქი</th><th>შეკვეთები</th><th>დახარჯვა</th><th>ბოლო შეკვეთა</th><th>სტატუსი</th><th /></tr></thead>
              <tbody>
                {visible.map((user) => {
                  const stats = customerStats.get(user.id);
                  return (
                    <tr key={user.id}>
                      <td>
                        <button type="button" onClick={() => setSelected(user)} className="flex items-center gap-2.5 text-left">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#c6aa82]/12 text-[8px] font-medium text-[var(--tone-accent-text)]">{getInitials(user.firstName, user.lastName)}</span>
                          <span>
                            <span className="block text-[11px] font-medium text-[var(--text-primary)]">{getFullName(user)}</span>
                            <span className="mt-0.5 block text-[9px] text-[var(--text-secondary)]">რეგ. {formatDate(user.createdAt)}</span>
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className="block text-[10px] text-[var(--text-primary)]">{user.email}</span>
                        <span className="mt-0.5 block text-[9px] text-[var(--text-secondary)]">{user.phone}</span>
                      </td>
                      <td className="text-[10px] text-[var(--text-secondary)]">{user.addresses[0]?.city ?? '—'}</td>
                      <td className="text-[10px] tabular-nums">{stats?.orders ?? 0}</td>
                      <td><MoneyText value={stats?.spent ?? 0} /></td>
                      <td className="whitespace-nowrap text-[10px] text-[var(--text-secondary)]">{stats?.lastOrder ? formatDate(stats.lastOrder) : '—'}</td>
                      <td>
                        <span className={user.status === 'active' ? 'text-[10px] text-[var(--tone-success-text)]' : 'text-[10px] text-[var(--tone-danger-text)]'}>
                          {user.status === 'active' ? 'აქტიური' : 'შეჩერებული'}
                        </span>
                      </td>
                      <td><button type="button" onClick={() => setSelected(user)} className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">პროფილი</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </div>

        <ul className="divide-y divide-[var(--line)] lg:hidden">
          {visible.map((user) => {
            const stats = customerStats.get(user.id);
            return (
              <li key={user.id}>
                <button type="button" onClick={() => setSelected(user)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-[var(--surface-hover)]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c6aa82]/12 text-[9px] font-medium text-[var(--tone-accent-text)]">{getInitials(user.firstName, user.lastName)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-medium text-[var(--text-primary)]">{getFullName(user)}</span>
                      <span className={user.status === 'active' ? 'text-[9px] text-[var(--tone-success-text)]' : 'text-[9px] text-[var(--tone-danger-text)]'}>{user.status === 'active' ? 'აქტიური' : 'შეჩერებული'}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[9px] text-[var(--text-secondary)]">{user.email}</span>
                    <span className="mt-1 flex items-center gap-3 text-[9px] text-[var(--text-secondary)]">
                      <span>{stats?.orders ?? 0} შეკვეთა</span>
                      <span>{formatMoney(stats?.spent ?? 0)}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {!visible.length && (
          <AdminEmpty
            title="მომხმარებლები ვერ მოიძებნა"
            icon={<SearchX className="h-4 w-4" aria-hidden />}
            action={<AdminButton size="sm" variant="secondary" onClick={() => { setSearch(''); setStatus('all'); }}>ფილტრების გასუფთავება</AdminButton>}
          />
        )}
        <Pagination page={safePage} pageCount={pageCount} onChange={setPage} total={filtered.length} />
      </AdminPanel>

      <AdminModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? getFullName(selected) : 'მომხმარებელი'}
        description={selected ? `${ROLE_LABELS[selected.role]} · რეგისტრაცია ${formatDate(selected.createdAt, 'long')}` : undefined}
        size="lg"
        footer={
          selected && (
            <div className="flex flex-wrap justify-between gap-2">
              <a href={`mailto:${selected.email}`}><AdminButton variant="secondary" size="sm" leftIcon={<Mail className="h-3.5 w-3.5" aria-hidden />}>ელფოსტა</AdminButton></a>
              <AdminButton
                variant={selected.status === 'active' ? 'danger' : 'success'}
                size="sm"
                onClick={() => setConfirmUser(selected)}
              >
                {selected.status === 'active' ? 'ანგარიშის შეჩერება' : 'ანგარიშის აღდგენა'}
              </AdminButton>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--line)] p-3">
                <p className="text-[8px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">შეკვეთები</p>
                <p className="mt-1 text-[15px] font-medium tabular-nums">{customerStats.get(selected.id)?.orders ?? 0}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] p-3">
                <p className="text-[8px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">დახარჯული</p>
                <p className="mt-1 text-[15px] font-medium tabular-nums">{formatMoney(customerStats.get(selected.id)?.spent ?? 0)}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] p-3">
                <p className="text-[8px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">რჩეულები</p>
                <p className="mt-1 text-[15px] font-medium tabular-nums">{selected.favoriteProductIds.length}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminPanel title="კონტაქტი" className="shadow-none">
                <ul className="space-y-2 text-[10px]">
                  <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Mail className="h-3 w-3" aria-hidden /> {selected.email}</li>
                  <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Phone className="h-3 w-3" aria-hidden /> {selected.phone}</li>
                  <li className="flex items-center gap-2 text-[var(--text-secondary)]"><UserRound className="h-3 w-3" aria-hidden /> {ROLE_LABELS[selected.role]}</li>
                </ul>
              </AdminPanel>
              <AdminPanel title="მისამართები" className="shadow-none">
                {selected.addresses.length ? (
                  <ul className="space-y-2">
                    {selected.addresses.map((address) => (
                      <li key={address.id} className="flex items-start gap-2 text-[10px] text-[var(--text-secondary)]">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                        <span>{address.label} · {address.city}, {address.street}{address.apartment ? `, ${address.apartment}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-[10px] text-[var(--text-secondary)]">მისამართები არ არის.</p>}
              </AdminPanel>
            </div>

            <AdminPanel title="შეკვეთების ისტორია" className="shadow-none" noPadding>
              <ul className="max-h-60 divide-y divide-[var(--line)] overflow-y-auto">
                {snapshot.orders.filter((order) => order.userId === selected.id).map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[10px]">
                    <span>{order.number}</span>
                    <span className="text-[var(--text-secondary)]">{formatDate(order.createdAt)}</span>
                    <MoneyText value={order.total} />
                  </li>
                ))}
                {!snapshot.orders.some((order) => order.userId === selected.id) && <li className="px-4 py-6 text-center text-[10px] text-[var(--text-secondary)]">შეკვეთები არ არის.</li>}
              </ul>
            </AdminPanel>
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={Boolean(confirmUser)}
        onClose={() => setConfirmUser(null)}
        title={confirmUser?.status === 'active' ? 'ანგარიშის შეჩერება' : 'ანგარიშის აღდგენა'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setConfirmUser(null)} disabled={updating}>გაუქმება</AdminButton>
            <AdminButton variant={confirmUser?.status === 'active' ? 'danger' : 'success'} loading={updating} onClick={() => void changeStatus()}>
              {confirmUser?.status === 'active' ? 'შეჩერება' : 'აღდგენა'}
            </AdminButton>
          </div>
        }
      >
        <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
          {confirmUser?.status === 'active'
            ? `${getFullName(confirmUser ?? { firstName: '', lastName: '' })}-ის ანგარიში შეჩერდება — აქტიური სესიები გაუქმდება და შემდგომი შესვლა დაბლოკდება.`
            : `${getFullName(confirmUser ?? { firstName: '', lastName: '' })}-ს ანგარიში კვლავ გააქტიურდება და შეძლებს შესვლას.`}
        </p>
      </AdminModal>
    </div>
  );
}
