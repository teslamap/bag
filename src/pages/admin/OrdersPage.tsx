import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, PackageSearch, SearchX } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import {
  AdminButton,
  AdminChip,
  AdminEmpty,
  AdminPageHeader,
  AdminPanel,
  AdminSearch,
  AdminSelect,
  MoneyText,
  OrderStatusPill,
  Pagination,
  TableWrap,
} from '@/components/admin/AdminUI';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/constants';
import { downloadCsv, formatDate, formatMoney, getFullName } from '@/lib/utils';
import type { DeliveryMethod, OrderStatus, PaymentStatus } from '@/lib/types';

type Sort = 'newest' | 'oldest' | 'total-desc' | 'total-asc';

export function AdminOrdersPage({ basePath = '/admin' }: { basePath?: string }) {
  const snapshot = useBackendSnapshot();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | OrderStatus>(() => {
    const value = params.get('status');
    return value && ORDER_STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : 'all';
  });
  const [payment, setPayment] = useState<'all' | PaymentStatus>('all');
  const [delivery, setDelivery] = useState<'all' | DeliveryMethod>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = snapshot.orders.filter((order) => {
      if (status !== 'all' && order.status !== status) return false;
      if (payment !== 'all' && order.paymentStatus !== payment) return false;
      if (delivery !== 'all' && order.deliveryMethod !== delivery) return false;
      if (!query) return true;
      return (
        order.number.toLowerCase().includes(query) ||
        order.customer.firstName.toLowerCase().includes(query) ||
        order.customer.lastName.toLowerCase().includes(query) ||
        order.customer.email.toLowerCase().includes(query) ||
        order.customer.phone.toLowerCase().includes(query) ||
        order.items.some((item) => item.productName.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query))
      );
    });
    return [...result].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'total-desc':
          return b.total - a.total;
        case 'total-asc':
          return a.total - b.total;
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [snapshot.orders, search, status, payment, delivery, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const counts = (value: OrderStatus) => snapshot.orders.filter((order) => order.status === value).length;

  const setStatusFilter = (value: 'all' | OrderStatus) => {
    setStatus(value);
    setPage(1);
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete('status');
    else next.set('status', value);
    setParams(next, { replace: true });
  };

  const exportCsv = () => {
    downloadCsv(
      'maku-orders.csv',
      ['ნომერი', 'თარიღი', 'მომხმარებელი', 'ელფოსტა', 'ტელეფონი', 'ნივთები', 'ქვეჯამი (₾)', 'ფასდაკლება (₾)', 'მიწოდება (₾)', 'ჯამი (₾)', 'სტატუსი', 'გადახდა', 'მიწოდების მეთოდი'],
      filtered.map((order) => [
        order.number,
        order.createdAt,
        getFullName(order.customer),
        order.customer.email,
        order.customer.phone,
        order.items.reduce((total, item) => total + item.quantity, 0),
        (order.subtotal / 100).toFixed(2),
        (order.discountTotal / 100).toFixed(2),
        (order.shippingFee / 100).toFixed(2),
        (order.total / 100).toFixed(2),
        ORDER_STATUS_LABELS[order.status],
        order.paymentStatus,
        order.deliveryMethod,
      ]),
    );
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="ოპერაციები"
        title={basePath === '/manager' ? 'შეკვეთების მართვა' : 'შეკვეთები'}
        description={`${snapshot.orders.length} შეკვეთა · ${snapshot.orders.filter((order) => order.status === 'new').length} ახალი · ${snapshot.orders.filter((order) => order.status === 'shipped').length} გზაში`}
        actions={
          <AdminButton variant="secondary" size="sm" leftIcon={<Download className="h-3.5 w-3.5" aria-hidden />} onClick={exportCsv}>
            CSV ექსპორტი
          </AdminButton>
        }
      />

      <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <AdminSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="შეკვეთა, მომხმარებელი, ელფოსტა, SKU…"
            className="lg:w-80"
          />
          <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
            <AdminSelect
              value={payment}
              onChange={(event) => {
                setPayment(event.target.value as typeof payment);
                setPage(1);
              }}
              className="h-8 w-auto min-w-28 py-0 text-[10px]"
              aria-label="გადახდის სტატუსი"
            >
              <option value="all">გადახდა — ყველა</option>
              <option value="unpaid">გადაუხდელი</option>
              <option value="paid">გადახდილი</option>
              <option value="refunded">დაბრუნებული</option>
            </AdminSelect>
            <AdminSelect
              value={delivery}
              onChange={(event) => {
                setDelivery(event.target.value as typeof delivery);
                setPage(1);
              }}
              className="h-8 w-auto min-w-28 py-0 text-[10px]"
              aria-label="მიწოდების მეთოდი"
            >
              <option value="all">მიწოდება — ყველა</option>
              <option value="standard">სტანდარტული</option>
              <option value="express">ექსპრეს</option>
            </AdminSelect>
            <AdminSelect
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="h-8 w-auto min-w-28 py-0 text-[10px]"
              aria-label="სორტირება"
            >
              <option value="newest">უახლესი</option>
              <option value="oldest">ძველი</option>
              <option value="total-desc">ჯამი ↓</option>
              <option value="total-asc">ჯამი ↑</option>
            </AdminSelect>
          </div>
        </div>
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
          <AdminChip active={status === 'all'} onClick={() => setStatusFilter('all')} count={snapshot.orders.length}>
            ყველა
          </AdminChip>
          {ORDER_STATUSES.map((entry) => (
            <AdminChip key={entry} active={status === entry} onClick={() => setStatusFilter(entry)} count={counts(entry)}>
              {ORDER_STATUS_LABELS[entry]}
            </AdminChip>
          ))}
        </div>
      </div>

      <AdminPanel noPadding>
        {/* Desktop table */}
        <div className="hidden lg:block">
          <TableWrap>
            <table className="admin-table w-full min-w-[900px]">
              <thead>
                <tr>
                  <th>შეკვეთა</th>
                  <th>მომხმარებელი</th>
                  <th>თარიღი</th>
                  <th>ნივთები</th>
                  <th>გადახდა</th>
                  <th>ჯამი</th>
                  <th>სტატუსი</th>
                  <th aria-label="მოქმედება" />
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link to={`${basePath}/orders/${order.id}`} className="font-medium text-[var(--text-primary)] hover:text-[var(--tone-accent-text)]">
                        {order.number}
                      </Link>
                      <span className="mt-0.5 block text-[9px] text-[var(--text-secondary)]">
                        {order.deliveryMethod === 'express' ? 'ექსპრესი' : 'სტანდარტული'}
                      </span>
                    </td>
                    <td>
                      <span className="text-[var(--text-primary)]">{getFullName(order.customer)}</span>
                      <span className="mt-0.5 block text-[9px] text-[var(--text-secondary)]">{order.customer.email}</span>
                    </td>
                    <td className="whitespace-nowrap text-[10px] text-[var(--text-secondary)]">{formatDate(order.createdAt)}</td>
                    <td className="text-[10px] text-[var(--text-secondary)]">
                      {order.items.reduce((total, item) => total + item.quantity, 0)} ც.
                      <span className="mt-0.5 block text-[9px]">{order.items.length} პოზიცია</span>
                    </td>
                    <td>
                      <span
                        className={
                          order.paymentStatus === 'paid'
                            ? 'text-[10px] text-[var(--tone-success-text)]'
                            : order.paymentStatus === 'refunded'
                              ? 'text-[10px] text-[var(--tone-danger-text)]'
                              : 'text-[10px] text-[var(--text-secondary)]'
                        }
                      >
                        {order.paymentStatus === 'paid' ? 'გადახდილი' : order.paymentStatus === 'refunded' ? 'დაბრუნებული' : 'გადაუხდელი'}
                      </span>
                      <span className="mt-0.5 block text-[9px] text-[var(--text-secondary)]">COD</span>
                    </td>
                    <td>
                      <MoneyText value={order.total} className="text-[12px] font-medium" />
                      {order.discountTotal > 0 && (
                        <span className="mt-0.5 block text-[9px] text-[var(--tone-success-text)]">−{formatMoney(order.discountTotal)}</span>
                      )}
                    </td>
                    <td>
                      <OrderStatusPill status={order.status} />
                    </td>
                    <td>
                      <Link
                        to={`${basePath}/orders/${order.id}`}
                        className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        დეტალები
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>

        {/* Mobile cards */}
        <ul className="divide-y divide-[var(--line)] lg:hidden">
          {visible.map((order) => (
            <li key={order.id}>
              <Link to={`${basePath}/orders/${order.id}`} className="block px-4 py-3.5 transition-colors hover:bg-[var(--surface-hover)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[var(--text-primary)]">{order.number}</p>
                    <p className="mt-0.5 truncate text-[10px] text-[var(--text-secondary)]">{getFullName(order.customer)}</p>
                  </div>
                  <OrderStatusPill status={order.status} />
                </div>
                <div className="mt-2.5 flex items-end justify-between gap-3">
                  <div className="text-[9px] text-[var(--text-secondary)]">
                    <p>{formatDate(order.createdAt)} · {order.items.reduce((total, item) => total + item.quantity, 0)} ნივთი</p>
                    <p className="mt-0.5">{order.paymentStatus === 'paid' ? 'გადახდილი' : 'გადაუხდელი'} · COD</p>
                  </div>
                  <MoneyText value={order.total} className="text-[13px] font-medium" />
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {!visible.length && (
          <AdminEmpty
            title="შეკვეთები ვერ მოიძებნა"
            description="შეცვალეთ ფილტრები ან ძიების სიტყვა."
            icon={<SearchX className="h-4 w-4" aria-hidden />}
            action={
              <AdminButton size="sm" variant="secondary" onClick={() => { setSearch(''); setStatusFilter('all'); setPayment('all'); setDelivery('all'); }}>
                ფილტრების გასუფთავება
              </AdminButton>
            }
          />
        )}
        <Pagination page={safePage} pageCount={pageCount} onChange={setPage} total={filtered.length} />
      </AdminPanel>

      {!snapshot.orders.length && <AdminEmpty title="შეკვეთები ჯერ არ არის" icon={<PackageSearch className="h-4 w-4" aria-hidden />} />}
    </div>
  );
}
