import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell, Boxes, CheckCircle2, Clock3, Package, ShoppingBag, Star, Truck } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { AdminEmpty, AdminPanel, AdminStat, MoneyText, OrderStatusPill } from '@/components/admin/AdminUI';
import { MiniBars } from '@/components/admin/Charts';
import { ManagerMasthead } from '@/components/manager/ManagerLayout';
import { canManageInventory, canManageOrders, canManageProducts, canManageReviews } from '@/domain/permissions';
import { dailySeries } from '@/domain/analytics';
import { formatDate, getFullName, getProductStock, timeAgo } from '@/lib/utils';

export function ManagerDashboardPage() {
  const snapshot = useBackendSnapshot();
  const session = snapshot.session;
  const role = session?.role ?? 'customer';
  const permissions = session?.permissions ?? [];
  const canOrders = canManageOrders(role, permissions);
  const canProducts = canManageProducts(role, permissions);
  const canInventory = canManageInventory(role, permissions);
  const canReviews = canManageReviews(role, permissions);

  const data = useMemo(() => {
    const orders = snapshot.orders;
    const newOrders = orders.filter((order) => order.status === 'new');
    const confirmed = orders.filter((order) => order.status === 'confirmed');
    const processing = orders.filter((order) => order.status === 'processing');
    const shipped = orders.filter((order) => order.status === 'shipped');
    const week = dailySeries(orders, 7);
    const todayKey = new Date().toLocaleDateString('en-CA');
    const todayOrders = orders.filter((order) => new Date(order.createdAt).toLocaleDateString('en-CA') === todayKey);
    const lowStock = snapshot.products
      .filter((product) => product.status === 'active' && getProductStock(product) <= product.lowStockThreshold)
      .sort((a, b) => getProductStock(a) - getProductStock(b));
    const pendingReviews = snapshot.reviews.filter((review) => review.status === 'pending');
    const active = orders.filter((order) => !['completed', 'cancelled'].includes(order.status));
    return { newOrders, confirmed, processing, shipped, week, todayOrders, lowStock, pendingReviews, active };
  }, [snapshot.orders, snapshot.products, snapshot.reviews]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'დილა მშვიდობისა';
    if (hour < 18) return 'შუადღე მშვიდობისა';
    return 'საღამო მშვიდობისა';
  })();

  const name = session ? `${session.firstName}` : '';
  const tasks = [
    canOrders && data.newOrders.length ? { to: '/manager/orders?status=new', label: 'დაადასტურეთ ახალი შეკვეთები', count: data.newOrders.length, icon: ShoppingBag } : null,
    canOrders && data.processing.length ? { to: '/manager/orders?status=processing', label: 'მოსამზადებელი შეკვეთები', count: data.processing.length, icon: Package } : null,
    canOrders && data.shipped.length ? { to: '/manager/orders?status=shipped', label: 'კურიერში გადაცემული', count: data.shipped.length, icon: Truck } : null,
    canInventory && data.lowStock.length ? { to: '/manager/inventory', label: 'დაბალი მარაგის პროდუქტი', count: data.lowStock.length, icon: Boxes } : null,
    canReviews && data.pendingReviews.length ? { to: '/manager/reviews', label: 'მოდერაციას ელოდება', count: data.pendingReviews.length, icon: Star } : null,
  ].filter(Boolean) as Array<{ to: string; label: string; count: number; icon: typeof ShoppingBag }>;

  return (
    <div className="space-y-5">
      <ManagerMasthead
        eyebrow="Workroom"
        title={`${greeting}${name ? `, ${name}` : ''}`}
        description="დღის ოპერაციული სურათი — შეკვეთები, მარაგი და მოდერაცია. ფინანსური რეპორტები მხოლოდ ადმინისტრატორს ხელმისაწვდომია."
        actions={
          canOrders && (
            <Link to="/manager/orders?status=new" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--text-primary)] bg-[var(--text-primary)] px-4 text-[10px] font-medium text-[var(--surface-raised)] transition-opacity hover:opacity-85">
              ახალი შეკვეთები <span className="rounded-full bg-white/15 px-1.5 py-0.5 tabular-nums">{data.newOrders.length}</span>
            </Link>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="დღეს მიღებული" value={canOrders ? data.todayOrders.length : '—'} sub={canOrders ? `${data.newOrders.length} დასადასტურებელი` : 'წვდომა შეზღუდული'} icon={<Clock3 className="h-4 w-4" aria-hidden />} />
        <AdminStat label="აქტიური ნაკადი" value={canOrders ? data.active.length : '—'} sub="დასრულებულის გარეშე" icon={<ShoppingBag className="h-4 w-4" aria-hidden />} accent="warning" />
        <AdminStat label="დაბალი მარაგი" value={canInventory ? data.lowStock.length : '—'} sub="საჭიროებს შევსებას" icon={<Boxes className="h-4 w-4" aria-hidden />} accent={data.lowStock.length ? 'danger' : 'success'} />
        <AdminStat label="მოდერაცია" value={canReviews ? data.pendingReviews.length : '—'} sub="მიმოხილვა მოლოდინში" icon={<Star className="h-4 w-4" aria-hidden />} accent={data.pendingReviews.length ? 'warning' : 'success'} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <AdminPanel
          title="დღის დავალებები"
          eyebrow="პრიორიტეტები"
          action={<span className="text-[9px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{tasks.length} ამოცანა</span>}
        >
          {tasks.length ? (
            <ul className="divide-y divide-[var(--line)]">
              {tasks.map((task) => (
                <li key={task.to}>
                  <Link to={task.to} className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-[var(--text-secondary)] transition-colors group-hover:border-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
                      <task.icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 text-[11px] text-[var(--text-primary)]">{task.label}</span>
                    <span className="rounded-md bg-[#b9a17c]/20 px-2 py-0.5 text-[9px] font-medium tabular-nums text-[var(--tone-accent-text)]">{task.count}</span>
                    <ArrowUpRight className="h-3 w-3 text-[var(--text-secondary)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-6 w-6 text-[#3f6b53]" aria-hidden />
              <p className="text-[11px] text-[var(--text-primary)]">ყველა პრიორიტეტი დახურულია</p>
              <p className="text-[9px] text-[var(--text-secondary)]">ახალი დავალებები აქ გამოჩნდება.</p>
            </div>
          )}
        </AdminPanel>

        <AdminPanel title="შეკვეთების რიტმი" eyebrow="ბოლო 7 დღე">
          <MiniBars points={data.week} metric="orders" className="h-20" />
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-4">
            <div className="rounded-lg border border-[var(--line)] p-2.5">
              <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">დადასტურებული</p>
              <p className="mt-1 text-[16px] font-medium tabular-nums">{canOrders ? data.confirmed.length : '—'}</p>
            </div>
            <div className="rounded-lg border border-[var(--line)] p-2.5">
              <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">მზადდება</p>
              <p className="mt-1 text-[16px] font-medium tabular-nums">{canOrders ? data.processing.length : '—'}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[9px] text-[var(--text-secondary)]">
            <span>გაგზავნილია</span>
            <span className="tabular-nums text-[var(--text-primary)]">{canOrders ? data.shipped.length : '—'}</span>
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <AdminPanel
          title="ბოლო შეკვეთები"
          eyebrow="ოპერაციული ნაკადი"
          action={canOrders && <Link to="/manager/orders" className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">ყველა <ArrowUpRight className="h-3 w-3" aria-hidden /></Link>}
          noPadding
        >
          {canOrders ? (
            <ul className="divide-y divide-[var(--line)]">
              {snapshot.orders.slice(0, 6).map((order) => (
                <li key={order.id}>
                  <Link to={`/manager/orders/${order.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)]">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-medium text-[var(--text-primary)]">{order.number}</p>
                        <OrderStatusPill status={order.status} />
                      </div>
                      <p className="mt-1 truncate text-[9px] text-[var(--text-secondary)]">{getFullName(order.customer)} · {order.items.length} ნივთი · {formatDate(order.createdAt)}</p>
                    </div>
                    <MoneyText value={order.total} className="text-[11px]" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <AdminEmpty title="წვდომა შეზღუდულია" description="შეკვეთების ნახვა არ შედის თქვენს უფლებებში." />
          )}
          {canOrders && !snapshot.orders.length && <AdminEmpty title="შეკვეთები ჯერ არ არის" />}
        </AdminPanel>

        <div className="space-y-3">
          <AdminPanel title="დაბალი მარაგი" eyebrow="ატელიე" action={canInventory && <Link to="/manager/inventory" className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">მართვა</Link>}>
            {canInventory ? (
              <ul className="space-y-3">
                {data.lowStock.slice(0, 4).map((product) => (
                  <li key={product.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] text-[var(--text-primary)]">{product.name}</p>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                        <div className="h-full rounded-full bg-[#8f3f3f]" style={{ width: `${Math.max(4, Math.min(100, (getProductStock(product) / Math.max(1, product.lowStockThreshold * 3)) * 100))}%` }} />
                      </div>
                    </div>
                    <span className="text-[10px] tabular-nums text-[#8f3f3f]">{getProductStock(product)}</span>
                  </li>
                ))}
                {!data.lowStock.length && <li className="py-4 text-center text-[10px] text-[var(--text-secondary)]">მარაგი ნორმაშია.</li>}
              </ul>
            ) : <p className="py-4 text-[10px] text-[var(--text-secondary)]">მარაგის ნახვა შეზღუდულია.</p>}
          </AdminPanel>

          <AdminPanel title="მოკლე ბმულები" eyebrow="სამუშაო">
            <div className="grid grid-cols-2 gap-2">
              {canOrders && <Link to="/manager/orders?status=new" className="flex flex-col gap-2 rounded-lg border border-[var(--line)] p-3 text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text-primary)]"><ShoppingBag className="h-4 w-4" aria-hidden /> შეკვეთები</Link>}
              {canProducts && <Link to="/manager/products" className="flex flex-col gap-2 rounded-lg border border-[var(--line)] p-3 text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text-primary)]"><Package className="h-4 w-4" aria-hidden /> პროდუქტი</Link>}
              {canInventory && <Link to="/manager/inventory" className="flex flex-col gap-2 rounded-lg border border-[var(--line)] p-3 text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text-primary)]"><Boxes className="h-4 w-4" aria-hidden /> მარაგი</Link>}
              <Link to="/manager/notifications" className="flex flex-col gap-2 rounded-lg border border-[var(--line)] p-3 text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text-primary)]"><Bell className="h-4 w-4" aria-hidden /> შეტყობინება</Link>
            </div>
          </AdminPanel>
        </div>
      </div>

      <p className="px-1 text-[9px] text-[var(--text-secondary)]">
        ბოლო განახლება {timeAgo(new Date().toISOString())} · მონაცემები რეალურ დროში ახლდება.
      </p>
    </div>
  );
}
