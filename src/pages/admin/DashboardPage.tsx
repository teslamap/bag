import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Boxes, Download, PackageCheck, Plus, Receipt, ShoppingBag, Star, TrendingUp, Users } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { AdminPageHeader, AdminPanel, AdminStat, AdminButton, AdminChip, RangeSelector, OrderStatusPill, AdminEmpty, MoneyText, ProductStatusPill } from '@/components/admin/AdminUI';
import { Donut, HorizontalBars, MiniBars, TrendChart } from '@/components/admin/Charts';
import {
  activeOrders,
  dailySeries,
  lowStockProducts,
  ordersInRange,
  percentChange,
  rangePreset,
  revenueByCategory,
  revenueOrders,
  statusCounts,
  topProducts,
} from '@/domain/analytics';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import { downloadCsv, formatDate, formatMoney, getProductStock, sum, timeAgo } from '@/lib/utils';

export function AdminDashboardPage() {
  const snapshot = useBackendSnapshot();
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  const data = useMemo(() => {
    const preset = rangePreset(range);
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const previous = rangePreset(range, new Date(range === '7d' ? Date.now() - 7 * 86400000 : range === '90d' ? Date.now() - 90 * 86400000 : Date.now() - 30 * 86400000));
    const scoped = ordersInRange(snapshot.orders, preset);
    const active = revenueOrders(scoped);
    const revenue = sum(active.map((order) => order.total));
    const previousActive = revenueOrders(ordersInRange(snapshot.orders, previous));
    const previousRevenue = sum(previousActive.map((order) => order.total));
    const customers = snapshot.users.filter((user) => user.role === 'customer');
    const newCustomers = customers.filter((user) => new Date(user.createdAt).getTime() >= preset.from.getTime()).length;
    const previousCustomers = customers.filter((user) => {
      const time = new Date(user.createdAt).getTime();
      return time >= previous.from.getTime() && time <= previous.to.getTime();
    }).length;
    return {
      scoped,
      active,
      revenue,
      orderCount: active.length,
      previousOrderCount: previousActive.length,
      aov: active.length ? Math.round(revenue / active.length) : 0,
      previousAov: previousActive.length ? Math.round(previousRevenue / previousActive.length) : 0,
      revenueDelta: percentChange(revenue, previousRevenue),
      orderDelta: percentChange(active.length, previousActive.length),
      customers,
      newCustomers,
      customerDelta: percentChange(newCustomers, previousCustomers),
      series: dailySeries(snapshot.orders, days),
      top: topProducts(snapshot.orders, snapshot.products, 5, preset),
      categories: revenueByCategory(snapshot.orders, snapshot.products, snapshot.categories, preset),
      statuses: statusCounts(scoped),
      lowStock: lowStockProducts(snapshot.products).slice(0, 5),
      pendingReviews: snapshot.reviews.filter((review) => review.status === 'pending').length,
      recent: [...snapshot.orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
      activeOrders: activeOrders(snapshot.orders),
    };
  }, [snapshot.orders, snapshot.products, snapshot.categories, snapshot.reviews, snapshot.users, range]);

  const exportReport = () => {
    downloadCsv(
      `maku-report-${range}.csv`,
      ['თარიღი', 'შეკვეთები', 'შემოსავალი (₾)'],
      data.series.map((point) => [point.date, point.orders, (point.revenue).toFixed(2)]),
    );
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="მიმოხილვა"
        title="დაშბორდი"
        description="ატელიეს კომერციული სურათი — შემოსავალი, შეკვეთები, მარაგი და მოდერაცია ერთ სივრცეში."
        actions={
          <>
            <RangeSelector value={range} onChange={(value) => setRange(value as typeof range)} options={[{ value: '7d', label: '7 დღე' }, { value: '30d', label: '30 დღე' }, { value: '90d', label: '90 დღე' }]} />
            <AdminButton variant="secondary" size="sm" leftIcon={<Download className="h-3.5 w-3.5" aria-hidden />} onClick={exportReport}>ექსპორტი</AdminButton>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="შემოსავალი" value={formatMoney(data.revenue)} delta={data.revenueDelta} sub={`${range === '7d' ? '7' : range === '90d' ? '90' : '30'} დღის განმავლობაში`} icon={<TrendingUp className="h-4 w-4" aria-hidden />} />
        <AdminStat label="შეკვეთები" value={data.orderCount} delta={data.orderDelta} sub="გაუქმებულის გარეშე" icon={<ShoppingBag className="h-4 w-4" aria-hidden />} />
        <AdminStat label="საშუალო შეკვეთა" value={formatMoney(data.aov)} delta={percentChange(data.aov, data.previousAov)} sub="AOV" icon={<Receipt className="h-4 w-4" aria-hidden />} />
        <AdminStat label="ახალი მომხმარებელი" value={data.newCustomers} delta={data.customerDelta} sub="პერიოდში რეგისტრირებული" icon={<Users className="h-4 w-4" aria-hidden />} accent="success" />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        <AdminPanel
          title="შემოსავლის დინამიკა"
          eyebrow={range === '7d' ? 'ბოლო 7 დღე' : range === '90d' ? 'ბოლო 90 დღე' : 'ბოლო 30 დღე'}
          action={<div className="flex items-center gap-2 text-[9px] text-[var(--text-secondary)]"><span className="h-1.5 w-1.5 rounded-full bg-[#c6aa82]" aria-hidden /> შემოსავალი</div>}
        >
          <TrendChart points={data.series} height={235} />
        </AdminPanel>

        <AdminPanel title="შეკვეთების სტატუსები" eyebrow="მიმდინარე პერიოდი">
          <Donut
            segments={data.statuses.map((entry) => ({ label: ORDER_STATUS_LABELS[entry.status], value: entry.count }))}
            centerLabel="შეკვეთა"
            centerValue={String(data.scoped.length)}
          />
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-4">
            {data.statuses.slice(0, 4).map((entry) => (
              <div key={entry.status} className="flex items-center gap-2 text-[10px]">
                <OrderStatusPill status={entry.status} />
                <span className="ml-auto tabular-nums text-[var(--text-primary)]">{entry.count}</span>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        <AdminPanel
          title="ბოლო შეკვეთები"
          eyebrow="ოპერაციები"
          action={<Link to="/admin/orders" className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">ყველა <ArrowUpRight className="h-3 w-3" aria-hidden /></Link>}
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="admin-table w-full min-w-[560px]">
              <thead><tr><th>შეკვეთა</th><th>მომხმარებელი</th><th>თარიღი</th><th>ჯამი</th><th>სტატუსი</th></tr></thead>
              <tbody>
                {data.recent.map((order) => (
                  <tr key={order.id}>
                    <td><Link to={`/admin/orders/${order.id}`} className="font-medium text-[var(--text-primary)] hover:text-[var(--tone-accent-text)]">{order.number}</Link></td>
                    <td><span className="text-[var(--text-primary)]">{order.customer.firstName} {order.customer.lastName}</span><span className="mt-0.5 block text-[9px] text-[var(--text-secondary)]">{order.items.length} ნივთი</span></td>
                    <td className="text-[10px] text-[var(--text-secondary)]">{formatDate(order.createdAt)}</td>
                    <td><MoneyText value={order.total} /></td>
                    <td><OrderStatusPill status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.recent.length && <AdminEmpty title="შეკვეთები ჯერ არ არის" />}
        </AdminPanel>

        <div className="space-y-3">
          <AdminPanel title="საჭიროებს ყურადღებას" eyebrow="ოპერაციული სიგნალები">
            <ul className="space-y-2.5">
              <li className="flex items-center justify-between gap-3 text-[10px]">
                <Link to="/admin/orders?status=new" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ShoppingBag className="h-3.5 w-3.5" aria-hidden /> ახალი შეკვეთები</Link>
                <span className="rounded-md bg-[#c6aa82]/12 px-2 py-1 tabular-nums text-[var(--tone-accent-text)]">{snapshot.orders.filter((order) => order.status === 'new').length}</span>
              </li>
              <li className="flex items-center justify-between gap-3 text-[10px]">
                <Link to="/admin/reviews" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><Star className="h-3.5 w-3.5" aria-hidden /> მოდერაციას ელოდება</Link>
                <span className="rounded-md bg-[#b88a43]/12 px-2 py-1 tabular-nums text-[var(--tone-warning-text)]">{data.pendingReviews}</span>
              </li>
              <li className="flex items-center justify-between gap-3 text-[10px]">
                <Link to="/admin/inventory" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><Boxes className="h-3.5 w-3.5" aria-hidden /> დაბალი მარაგი</Link>
                <span className="rounded-md bg-[#a04a4a]/12 px-2 py-1 tabular-nums text-[var(--tone-danger-text)]">{snapshot.products.filter((product) => product.status === 'active' && getProductStock(product) <= product.lowStockThreshold).length}</span>
              </li>
              <li className="flex items-center justify-between gap-3 text-[10px]">
                <Link to="/admin/orders" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><PackageCheck className="h-3.5 w-3.5" aria-hidden /> აქტიური მიწოდება</Link>
                <span className="rounded-md bg-[#6f96a6]/12 px-2 py-1 tabular-nums text-[var(--tone-info-text)]">{data.activeOrders.length}</span>
              </li>
            </ul>
            <div className="mt-4 border-t border-[var(--line)] pt-4">
              <div className="flex items-center justify-between text-[9px] text-[var(--text-secondary)]">
                <span>შეკვეთების ინტენსივობა</span>
                <span>7 დღე</span>
              </div>
              <MiniBars points={data.series.slice(-7)} className="mt-2" />
            </div>
          </AdminPanel>

          <AdminPanel title="სწრაფი მოქმედებები">
            <div className="grid grid-cols-2 gap-2">
              <Link to="/admin/products/new" className="flex flex-col gap-2 rounded-lg border border-[var(--line)] p-3 text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text-primary)]"><Plus className="h-4 w-4" aria-hidden /> ახალი პროდუქტი</Link>
              <Link to="/admin/promotions" className="flex flex-col gap-2 rounded-lg border border-[var(--line)] p-3 text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text-primary)]"><Star className="h-4 w-4" aria-hidden /> პრომოკოდი</Link>
              <Link to="/admin/inventory" className="flex flex-col gap-2 rounded-lg border border-[var(--line)] p-3 text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text-primary)]"><Boxes className="h-4 w-4" aria-hidden /> მარაგის განახლება</Link>
              <Link to="/admin/notifications" className="flex flex-col gap-2 rounded-lg border border-[var(--line)] p-3 text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text-primary)]"><ArrowUpRight className="h-4 w-4" aria-hidden /> შეტყობინებები</Link>
            </div>
          </AdminPanel>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <AdminPanel title="ტოპ პროდუქტები" eyebrow="გაყიდვებით" action={<Link to="/admin/products" className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">ყველა</Link>} noPadding>
          <ul className="divide-y divide-[var(--line)]">
            {data.top.map((entry, index) => (
              <li key={entry.productId} className="flex items-center gap-3 px-4 py-3">
                <span className="w-4 text-[10px] tabular-nums text-[var(--text-secondary)]">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] text-[var(--text-primary)]">{entry.name}</p>
                  <p className="mt-0.5 text-[9px] text-[var(--text-secondary)]">{entry.quantity} გაყიდული</p>
                </div>
                <MoneyText value={entry.revenue} className="text-[11px]" />
              </li>
            ))}
          </ul>
          {!data.top.length && <AdminEmpty title="გაყიდვები არ არის" />}
        </AdminPanel>

        <AdminPanel title="კატეგორიების შემოსავალი" eyebrow="განაწილება">
          <HorizontalBars data={data.categories.slice(0, 5).map((entry) => ({ label: entry.name, value: entry.revenue, sub: `${entry.orders} ხაზი` }))} />
        </AdminPanel>

        <AdminPanel title="დაბალი მარაგი" eyebrow="მარაგის კონტროლი" action={<Link to="/admin/inventory" className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">მართვა</Link>}>
          <ul className="space-y-3">
            {data.lowStock.map((product) => (
              <li key={product.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link to={`/admin/products/${product.id}/edit`} className="block truncate text-[10px] text-[var(--text-primary)] hover:text-[var(--tone-accent-text)]">{product.name}</Link>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                    <div className="h-full rounded-full bg-[#a04a4a]" style={{ width: `${Math.max(4, Math.min(100, (getProductStock(product) / Math.max(1, product.lowStockThreshold * 3)) * 100))}%` }} />
                  </div>
                </div>
                <span className="shrink-0 text-[10px] tabular-nums text-[var(--tone-danger-text)]">{getProductStock(product)}</span>
              </li>
            ))}
            {!data.lowStock.length && <li className="py-6 text-center text-[10px] text-[var(--text-secondary)]">მარაგი ნორმაშია.</li>}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3 text-[9px] text-[var(--text-secondary)]">
            <span>აქტიური პროდუქტი</span>
            <span className="tabular-nums text-[var(--text-primary)]">{snapshot.products.filter((product) => product.status === 'active').length}</span>
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <AdminPanel title="აქტიური პრომოკოდები" eyebrow="მარკეტინგი" action={<Link to="/admin/promotions" className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">მართვა</Link>}>
          <div className="flex flex-wrap gap-2">
            {snapshot.promotions.filter((promotion) => promotion.active).map((promotion) => (
              <span key={promotion.id} className="inline-flex items-center gap-2 rounded-lg border border-[#c6aa82]/25 bg-[#c6aa82]/[0.06] px-2.5 py-1.5 font-mono text-[10px] text-[var(--tone-accent-text)]">
                {promotion.code}
                <span className="text-[8px] text-[var(--text-secondary)]">{promotion.type === 'percent' ? `${promotion.value}%` : formatMoney(promotion.value)}</span>
              </span>
            ))}
            {!snapshot.promotions.filter((promotion) => promotion.active).length && <p className="py-4 text-[10px] text-[var(--text-secondary)]">აქტიური პრომოკოდი არ არის.</p>}
          </div>
        </AdminPanel>

        <AdminPanel title="ბოლო აქტივობა" eyebrow="აუდიტი" action={<Link to="/admin/audit" className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">ჟურნალი</Link>}>
          <ul className="space-y-2.5">
            {snapshot.auditLogs.slice(0, 5).map((entry) => (
              <li key={entry.id} className="flex items-start gap-3">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#c6aa82]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] text-[var(--text-primary)]">{entry.summary}</p>
                  <p className="mt-0.5 text-[8px] text-[var(--text-secondary)]">{entry.actorName} · {timeAgo(entry.createdAt)}</p>
                </div>
              </li>
            ))}
            {!snapshot.auditLogs.length && <li className="py-4 text-[10px] text-[var(--text-secondary)]">ჩანაწერები არ არის.</li>}
          </ul>
        </AdminPanel>
      </div>
    </div>
  );
}
