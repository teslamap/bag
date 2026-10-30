import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  Heart,
  MapPin,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useBackendSnapshot, useCurrentUser } from '@/state/backend';
import { backend } from '@/backend';
import { useCartStore } from '@/state/cart';
import { toast } from '@/state/toast';
import { Button } from '@/components/ui/Button';
import { Badge, ConfirmDialog, EmptyState, InlineNotice, Modal } from '@/components/ui/Feedback';
import { Input, FormError, Checkbox } from '@/components/ui/Input';
import { SafeImage } from '@/components/ui/SafeImage';
import { ProductCard } from '@/components/store/ProductCard';
import { Rating } from '@/components/ui/Rating';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_HINTS,
  DELIVERY_METHOD_LABELS,
  GEORGIAN_CITIES,
} from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  getFullName,
  getInitials,
  makeId,
  STATUS_TONES,
  timeAgo,
} from '@/lib/utils';
import { addressSchema, fieldErrors, passwordSchema, profileSchema } from '@/lib/validation';
import type { Address, OrderStatus } from '@/lib/types';

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONES[status]} dot>{ORDER_STATUS_LABELS[status]}</Badge>;
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl font-light tracking-display">{title}</h1>
        {description && <p className="mt-2 text-[11px] leading-relaxed text-ink/65">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AccountDashboard() {
  const snapshot = useBackendSnapshot();
  const user = useCurrentUser();
  const orders = snapshot.orders;
  const active = orders.filter((order) => ['new', 'confirmed', 'processing', 'shipped'].includes(order.status));
  const spent = orders.filter((order) => order.status !== 'cancelled').reduce((total, order) => total + order.total, 0);
  const unread = snapshot.notifications.filter((notification) => !notification.readBy.includes(snapshot.session?.id ?? ''));
  const favorites = user?.favoriteProductIds.length ?? 0;

  return (
    <div>
      <PageTitle
        eyebrow="ჩემი ანგარიში"
        title={`გამარჯობა, ${user?.firstName ?? ''}`}
        description="აქ იხილავთ შეკვეთებს, რჩეულებსა და ანგარიშის პარამეტრებს."
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'აქტიური შეკვეთა', value: active.length, icon: Package, href: '/account/orders' },
          { label: 'სულ დახარჯული', value: formatMoney(spent), icon: ShoppingBag, href: '/account/orders' },
          { label: 'რჩეული', value: favorites, icon: Heart, href: '/account/favorites' },
          { label: 'წაუკითხავი', value: unread.length, icon: Bell, href: '/account/notifications' },
        ].map((stat) => (
          <Link key={stat.label} to={stat.href} className="group border border-ink/10 p-5 transition-colors hover:border-ink/30">
            <div className="flex items-center justify-between">
              <stat.icon className="h-4 w-4 text-earth" strokeWidth={1.4} aria-hidden />
              <ChevronRight className="h-3.5 w-3.5 text-ink/20 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </div>
            <p className="mt-5 font-display text-3xl font-light tabular-nums">{stat.value}</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-ink/65">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1.4fr_0.6fr]">
        <section>
          <div className="flex items-end justify-between border-b border-ink/10 pb-3">
            <h2 className="font-display text-2xl font-light">ბოლო შეკვეთები</h2>
            <Link to="/account/orders" className="text-[9px] uppercase tracking-[0.14em] text-ink/65 hover:text-ink">ყველა</Link>
          </div>
          {orders.length ? (
            <ul className="divide-y divide-ink/10">
              {orders.slice(0, 4).map((order) => (
                <li key={order.id}>
                  <Link to={`/account/orders/${order.id}`} className="group flex items-center gap-4 py-4">
                    <div className="flex -space-x-2">
                      {order.items.slice(0, 2).map((item) => (
                        <SafeImage
                          key={`${item.productId}:${item.variantId}`}
                          source={item.image}
                          alt={item.productName}
                          wrapperClassName="h-14 w-11 border border-ivory bg-stone"
                          width={480}
                        />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium">{order.number}</p>
                      <p className="mt-1 text-[9px] text-ink/65">{formatDate(order.createdAt, 'long')} · {order.items.length} ნივთი</p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                    <p className="hidden text-[11px] tabular-nums sm:block">{formatMoney(order.total)}</p>
                    <ChevronRight className="h-4 w-4 text-ink/20 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="ჯერ არ გაქვთ შეკვეთა" description="დაათვალიერეთ კოლექცია და იპოვეთ თქვენი პირველი ობიექტი." action={<Link to="/catalog" className="text-[10px] uppercase tracking-[0.14em] underline underline-offset-4">კოლექცია</Link>} />
          )}
        </section>
        <aside>
          <div className="border border-ink/10 p-5">
            <p className="eyebrow">ანგარიში</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-[10px] text-ivory">
                {user ? getInitials(user.firstName, user.lastName) : 'M'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium">{user ? getFullName(user) : '—'}</p>
                <p className="truncate text-[9px] text-ink/65">{user?.email}</p>
              </div>
            </div>
            <p className="mt-4 text-[9px] leading-relaxed text-ink/65">წევრია {user ? formatDate(user.createdAt, 'long') : '—'}-დან</p>
            <Link to="/account/profile" className="mt-4 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-ink/65 underline underline-offset-4 hover:text-ink">
              პროფილის რედაქტირება
            </Link>
          </div>
          {unread.length > 0 && (
            <div className="mt-3 border border-champagne/30 bg-champagne/[0.06] p-5">
              <p className="flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-earth"><Bell className="h-3.5 w-3.5" aria-hidden /> ახალი შეტყობინება</p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink/65">{unread[0].title}</p>
              <Link to="/account/notifications" className="mt-3 inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-ink/65 hover:text-ink">
                ნახვა <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function AccountOrdersPage() {
  const snapshot = useBackendSnapshot();
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const orders = snapshot.orders;
  const filtered = filter === 'all' ? orders : orders.filter((order) => order.status === filter);
  const tabs: Array<{ id: 'all' | OrderStatus; label: string }> = [
    { id: 'all', label: 'ყველა' },
    ...ORDER_STATUSES.map((status) => ({ id: status, label: ORDER_STATUS_LABELS[status] })),
  ];

  return (
    <div>
      <PageTitle eyebrow="შეკვეთები" title="შეკვეთების ისტორია" description="თვალყური ადევნეთ მიმდინარე და დასრულებულ შეკვეთებს." />
      <div className="mt-5 flex gap-1 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const count = tab.id === 'all' ? orders.length : orders.filter((order) => order.status === tab.id).length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`shrink-0 border px-3 py-2 text-[9px] uppercase tracking-[0.12em] transition-colors ${filter === tab.id ? 'border-ink bg-ink text-ivory' : 'border-ink/10 text-ink/65 hover:border-ink/30'}`}
            >
              {tab.label} <span className="ml-1 opacity-50">{count}</span>
            </button>
          );
        })}
      </div>
      {filtered.length ? (
        <ul className="mt-5 space-y-3">
          {filtered.map((order) => (
            <li key={order.id} className="border border-ink/10">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3">
                <div>
                  <p className="text-[11px] font-medium">{order.number}</p>
                  <p className="mt-0.5 text-[9px] text-ink/65">{formatDateTime(order.createdAt)}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex -space-x-2">
                    {order.items.slice(0, 3).map((item) => (
                      <SafeImage key={`${item.productId}:${item.variantId}`} source={item.image} alt={item.productName} wrapperClassName="h-14 w-11 border border-ivory" width={480} />
                    ))}
                  </div>
                  <p className="text-[10px] text-ink/65">
                    {order.items.map((item) => item.productName).join(', ')}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-5 sm:justify-end">
                  <p className="font-display text-xl tabular-nums">{formatMoney(order.total)}</p>
                  <Link to={`/account/orders/${order.id}`} className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-ink/65 hover:text-ink">
                    დეტალები <ChevronRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title="შეკვეთა ვერ მოიძებნა" description="ამ სტატუსით შეკვეთა არ არის." />
      )}
    </div>
  );
}

export function AccountOrderDetailPage() {
  const { id } = useParams();
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const add = useCartStore((state) => state.add);
  const order = snapshot.orders.find((entry) => entry.id === id);

  if (!order) {
    return (
      <div>
        <PageTitle eyebrow="შეკვეთა" title="ვერ მოიძებნა" />
        <EmptyState compact title="შეკვეთა ვერ მოიძებნა" description="შესაძლოა ბმული არასწორია." action={<Link to="/account/orders"><Button variant="outline" size="sm">უკან</Button></Link>} />
      </div>
    );
  }

  const reorder = () => {
    let added = 0;
    for (const item of order.items) {
      const product = snapshot.products.find((entry) => entry.id === item.productId);
      const variant = product?.variants.find((entry) => entry.id === item.variantId);
      if (product && variant && variant.stock > 0) {
        add(product.id, variant.id, Math.min(item.quantity, variant.stock));
        added += 1;
      }
    }
    if (added) toast(`${added} პროდუქტი დაემატა კალათას`, { variant: 'success' });
    else toast('პროდუქტები ამჟამად მიუწვდომელია', { variant: 'warning' });
  };

  return (
    <div>
      <Link to="/account/orders" className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-ink/65 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> შეკვეთები
      </Link>
      <div className="mt-5 flex flex-col justify-between gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">შეკვეთა</p>
          <h1 className="mt-2 font-display text-4xl font-light tracking-display">{order.number}</h1>
          <p className="mt-1 text-[11px] text-ink/65">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <Button variant="outline" size="sm" onClick={reorder}>ხელახლა შეკვეთა</Button>
        </div>
      </div>

      <div className="mt-7 grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-2xl font-light">პროდუქტები</h2>
            <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
              {order.items.map((item) => (
                <li key={`${item.productId}:${item.variantId}`} className="flex items-center gap-4 py-4">
                  <Link to={`/product/${item.productSlug}`} className="shrink-0">
                    <SafeImage source={item.image} alt={item.productName} wrapperClassName="h-24 w-[72px] bg-stone" width={480} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/product/${item.productSlug}`} className="font-display text-xl hover:text-earth">{item.productName}</Link>
                    <p className="mt-1 text-[10px] text-ink/65">{item.variantLabel} · {item.sku}</p>
                    <p className="mt-1 text-[10px] text-ink/65">{item.quantity} × {formatMoney(item.unitPrice)}</p>
                  </div>
                  <p className="text-[11px] tabular-nums">{formatMoney(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <div className="ml-auto mt-4 max-w-xs space-y-2 text-[11px]">
              <div className="flex justify-between text-ink/65"><span>ქვეჯამი</span><span className="tabular-nums">{formatMoney(order.subtotal)}</span></div>
              {order.discountTotal > 0 && <div className="flex justify-between text-[#3f6b53]"><span>ფასდაკლება</span><span className="tabular-nums">−{formatMoney(order.discountTotal)}</span></div>}
              <div className="flex justify-between text-ink/65"><span>მიწოდება</span><span className="tabular-nums">{order.shippingFee === 0 ? 'უფასო' : formatMoney(order.shippingFee)}</span></div>
              <div className="flex items-baseline justify-between border-t border-ink/10 pt-2"><span className="text-[9px] uppercase tracking-[0.14em]">ჯამი</span><span className="font-display text-2xl tabular-nums">{formatMoney(order.total)}</span></div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl font-light">სტატუსის ისტორია</h2>
            <ol className="mt-4 space-y-0 border-l border-ink/10 pl-5">
              {order.timeline.map((entry, index) => (
                <li key={`${entry.status}-${entry.at}`} className="relative pb-5">
                  <span className={`absolute -left-[26px] top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full ${index === order.timeline.length - 1 ? 'bg-ink' : 'bg-ink/25'}`} aria-hidden />
                  <p className="text-[11px] font-medium">{ORDER_STATUS_LABELS[entry.status]}</p>
                  <p className="mt-0.5 text-[9px] text-ink/65">{formatDateTime(entry.at)} · {entry.by}</p>
                  {entry.note && <p className="mt-1 text-[10px] text-ink/65">{entry.note}</p>}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-[10px] text-ink/65">{ORDER_STATUS_HINTS[order.status]}</p>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="border border-ink/10 p-4">
            <p className="text-[8px] uppercase tracking-[0.16em] text-ink/65">მიწოდების მისამართი</p>
            <p className="mt-2 text-[11px] leading-relaxed">
              {order.address.firstName} {order.address.lastName}<br />
              {order.address.city}, {order.address.street}{order.address.apartment ? `, ${order.address.apartment}` : ''}<br />
              {order.address.phone}
            </p>
            <p className="mt-2 text-[10px] text-ink/65">{DELIVERY_METHOD_LABELS[order.deliveryMethod]}</p>
          </div>
          <div className="border border-ink/10 p-4">
            <p className="text-[8px] uppercase tracking-[0.16em] text-ink/65">გადახდა</p>
            <p className="mt-2 text-[11px]">მიღებისას · {formatMoney(order.total)}</p>
            <p className="mt-1 text-[10px] text-ink/65">სტატუსი: {order.paymentStatus === 'paid' ? 'გადახდილი' : order.paymentStatus === 'refunded' ? 'დაბრუნებული' : 'გადასახდელი'}</p>
          </div>
          {order.notes && (
            <div className="border border-ink/10 p-4">
              <p className="text-[8px] uppercase tracking-[0.16em] text-ink/65">შენიშვნა</p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink/65">{order.notes}</p>
            </div>
          )}
          <div className="border border-ink/10 p-4">
            <p className="text-[8px] uppercase tracking-[0.16em] text-ink/65">დახმარება</p>
            <p className="mt-2 text-[10px] leading-relaxed text-ink/65">შეკვეთის შესახებ კითხვის შემთხვევაში მოგვწერეთ ნომრით {order.number}.</p>
            <Link to="/contact" className="mt-3 inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-ink/65 hover:text-ink">კონტაქტი <ArrowRight className="h-3 w-3" aria-hidden /></Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function AccountFavoritesPage() {
  const snapshot = useBackendSnapshot();
  const user = useCurrentUser();
  const products = snapshot.products.filter((product) => user?.favoriteProductIds.includes(product.id) && product.status === 'active');
  return (
    <div>
      <PageTitle eyebrow="რჩეულები" title="შენახული ობიექტები" description="თქვენ მიერ მონიშნული პროდუქტები." />
      {products.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3">
          {products.map((product) => <ProductCard key={product.id} product={product} compact />)}
        </div>
      ) : (
        <EmptyState
          icon={<Heart className="h-5 w-5" aria-hidden />}
          title="რჩეულები ცარიელია"
          description="მონიშნეთ გული პროდუქტის ბარათზე და შეინახეთ ის აქ."
          action={<Link to="/catalog"><Button variant="outline" size="sm">კოლექციის ნახვა</Button></Link>}
        />
      )}
    </div>
  );
}

const emptyAddress = (): Address => ({
  id: '',
  label: 'სახლი',
  firstName: '',
  lastName: '',
  phone: '',
  city: 'თბილისი',
  street: '',
  apartment: '',
  postalCode: '',
  isDefault: false,
});

export function AccountAddressesPage() {
  const user = useCurrentUser();
  const addresses = user?.addresses ?? [];
  const [editing, setEditing] = useState<Address | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [defaulting, setDefaulting] = useState<string | null>(null);

  const openNew = () => {
    const base = emptyAddress();
    setEditing({
      ...base,
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
      isDefault: addresses.length === 0,
    });
    setErrors({});
  };

  const save = async () => {
    if (!editing) return;
    const parsed = addressSchema.safeParse(editing);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setSaving(true);
    try {
      await backend.saveAddress({ ...editing, id: editing.id || makeId('addr') });
      toast(editing.id ? 'მისამართი განახლდა' : 'მისამართი დაემატა');
      setEditing(null);
    } catch (error) {
      toast('ვერ შეინახა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await backend.deleteAddress(deleting.id);
      toast('მისამართი წაიშალა', { variant: 'info' });
      setDeleting(null);
    } catch (error) {
      toast('ვერ წაიშალა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const makeDefault = async (address: Address) => {
    setDefaulting(address.id);
    try {
      await backend.setDefaultAddress(address.id);
      toast('ნაგულისხმევი მისამართი განახლდა');
    } catch (error) {
      toast('ვერ განახლდა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setDefaulting(null);
    }
  };

  return (
    <div>
      <PageTitle
        eyebrow="მისამართები"
        title="მიწოდების მისამართები"
        description="შეინახეთ მისამართები სწრაფი გადახდისთვის."
        action={<Button size="sm" onClick={openNew} leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden />}>ახალი მისამართი</Button>}
      />
      {addresses.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="flex flex-col border border-ink/10 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-earth" strokeWidth={1.4} aria-hidden />
                  <p className="text-[10px] uppercase tracking-[0.12em]">{address.label}</p>
                </div>
                {address.isDefault && <Badge tone="accent">ნაგულისხმევი</Badge>}
              </div>
              <p className="mt-4 flex-1 text-[11px] leading-relaxed text-ink/65">
                {address.firstName} {address.lastName}<br />
                {address.city}, {address.street}{address.apartment ? `, ${address.apartment}` : ''}<br />
                {address.phone}{address.postalCode ? ` · ${address.postalCode}` : ''}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-3">
                <button type="button" onClick={() => { setEditing(address); setErrors({}); }} className="text-[9px] uppercase tracking-[0.12em] text-ink/65 hover:text-ink">რედაქტირება</button>
                {!address.isDefault && (
                  <button type="button" disabled={defaulting === address.id} onClick={() => void makeDefault(address)} className="text-[9px] uppercase tracking-[0.12em] text-ink/65 hover:text-ink disabled:opacity-40">
                    ნაგულისხმევად
                  </button>
                )}
                <button type="button" onClick={() => setDeleting(address)} className="ml-auto flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-[#8f3f3f] hover:opacity-70">
                  <Trash2 className="h-3 w-3" aria-hidden /> წაშლა
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<MapPin className="h-5 w-5" aria-hidden />}
          title="მისამართი არ არის"
          description="დაამატეთ მისამართი, რომ შემდეგი შეკვეთა უფრო სწრაფად გააფორმოთ."
          action={<Button variant="outline" size="sm" onClick={openNew}>მისამართის დამატება</Button>}
        />
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'მისამართის რედაქტირება' : 'ახალი მისამართი'}
        size="md"
        footer={<div className="flex justify-end gap-3"><Button variant="ghost" size="sm" onClick={() => setEditing(null)}>გაუქმება</Button><Button size="sm" loading={saving} onClick={() => void save()}>შენახვა</Button></div>}
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="სახელი" value={editing.label} onChange={(event) => setEditing({ ...editing, label: event.target.value })} error={errors.label} />
            <Input label="ტელეფონი" value={editing.phone} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} error={errors.phone} />
            <Input label="მიმღების სახელი" value={editing.firstName} onChange={(event) => setEditing({ ...editing, firstName: event.target.value })} error={errors.firstName} />
            <Input label="მიმღების გვარი" value={editing.lastName} onChange={(event) => setEditing({ ...editing, lastName: event.target.value })} error={errors.lastName} />
            <Input label="ქალაქი" value={editing.city} onChange={(event) => setEditing({ ...editing, city: event.target.value })} error={errors.city} list="georgian-cities" />
            <datalist id="georgian-cities">{GEORGIAN_CITIES.map((city) => <option key={city} value={city} />)}</datalist>
            <Input label="საფოსტო ინდექსი" value={editing.postalCode ?? ''} onChange={(event) => setEditing({ ...editing, postalCode: event.target.value })} />
            <div className="sm:col-span-2">
              <Input label="ქუჩა და ნომერი" value={editing.street} onChange={(event) => setEditing({ ...editing, street: event.target.value })} error={errors.street} />
            </div>
            <div className="sm:col-span-2">
              <Input label="ბინა / ოფისი" value={editing.apartment ?? ''} onChange={(event) => setEditing({ ...editing, apartment: event.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Checkbox label="ნაგულისხმევი მისამართი" checked={Boolean(editing.isDefault)} onChange={(event) => setEditing({ ...editing, isDefault: event.target.checked })} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => void remove()}
        title="მისამართის წაშლა"
        description={deleting ? `${deleting.label} — ${deleting.city}, ${deleting.street}. ეს მოქმედება შეუქცევადია.` : ''}
        confirmLabel="წაშლა"
        loading={deleteLoading}
      />
    </div>
  );
}

export function AccountNotificationsPage() {
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const notifications = filter === 'unread'
    ? snapshot.notifications.filter((notification) => !notification.readBy.includes(snapshot.session?.id ?? ''))
    : snapshot.notifications;

  const openNotification = async (id: string, link?: string) => {
    await backend.markNotificationRead(id);
    if (link) navigate(link);
  };

  return (
    <div>
      <PageTitle
        eyebrow="შეტყობინებები"
        title="ატელიეს შეტყობინებები"
        description="შეკვეთების, მიმოხილვებისა და ანგარიშის განახლებები."
        action={
          <div className="flex items-center gap-2">
            <Button variant={filter === 'all' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('all')}>ყველა</Button>
            <Button variant={filter === 'unread' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('unread')}>წაუკითხავი</Button>
          </div>
        }
      />
      {notifications.length ? (
        <>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => void backend.markAllNotificationsRead()} className="text-[9px] uppercase tracking-[0.12em] text-ink/65 hover:text-ink">
              ყველას წაკითხვად მონიშვნა
            </button>
          </div>
          <ul className="mt-2 divide-y divide-ink/10 border-y border-ink/10">
            {notifications.map((notification) => {
              const unread = !notification.readBy.includes(snapshot.session?.id ?? '');
              return (
                <li key={notification.id}>
                  <button type="button" onClick={() => void openNotification(notification.id, notification.link)} className="w-full py-4 text-left">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${unread ? 'bg-champagne' : 'bg-transparent'}`} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[11px] ${unread ? 'font-medium text-ink' : 'text-ink/65'}`}>{notification.title}</span>
                        <span className="mt-1 block text-[10px] leading-relaxed text-ink/65">{notification.message}</span>
                        <span className="mt-1.5 block text-[9px] uppercase tracking-[0.08em] text-ink/65">{timeAgo(notification.createdAt)}</span>
                      </span>
                      {notification.link && <ChevronRight className="mt-1 h-3.5 w-3.5 text-ink/20" aria-hidden />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <EmptyState icon={<Bell className="h-5 w-5" aria-hidden />} title="შეტყობინება არ არის" description={filter === 'unread' ? 'ყველა შეტყობინება წაკითხულია.' : 'ჯერ არ გაქვთ შეტყობინებები.'} />
      )}
    </div>
  );
}

export function AccountProfilePage() {
  const snapshot = useBackendSnapshot();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', phone: user?.phone ?? '' });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      setProfileErrors(fieldErrors(parsed.error));
      return;
    }
    setProfileSaving(true);
    try {
      await backend.updateProfile(parsed.data);
      toast('პროფილი განახლდა');
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.currentPassword = 'შეიყვანეთ მიმდინარე პაროლი.';
    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) errors.newPassword = parsed.error.issues[0]?.message ?? 'პაროლი არასწორია.';
    if (newPassword !== confirmPassword) errors.confirmPassword = 'პაროლები არ ემთხვევა.';
    if (Object.keys(errors).length) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordSaving(true);
    try {
      await backend.changePassword(currentPassword, newPassword);
      toast('პაროლი შეიცვალა');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setPasswordSaving(false);
    }
  };

  const logout = async () => {
    await backend.logout();
    navigate('/');
  };

  return (
    <div>
      <PageTitle eyebrow="პროფილი" title="ანგარიშის პარამეტრები" description="განაახლეთ პირადი მონაცემები და პაროლი." />
      <div className="mt-6 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="border border-ink/10 p-5 md:p-6">
          <div className="flex items-center gap-3">
            <UserRound className="h-4 w-4 text-earth" strokeWidth={1.4} aria-hidden />
            <h2 className="font-display text-2xl font-light">პირადი მონაცემები</h2>
          </div>
          <form onSubmit={saveProfile} className="mt-5 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="სახელი" value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} error={profileErrors.firstName} required />
              <Input label="გვარი" value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} error={profileErrors.lastName} required />
            </div>
            <Input label="ტელეფონი" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} error={profileErrors.phone} required />
            <Input label="ელფოსტა" value={user?.email ?? ''} disabled hint="ელფოსტის შეცვლა მხარდაჭერით შესაძლებელია" />
            {formError && <FormError>{formError}</FormError>}
            <Button type="submit" size="sm" loading={profileSaving}>ცვლილებების შენახვა</Button>
          </form>
          <div className="mt-6 grid gap-2 border-t border-ink/10 pt-4 text-[9px] uppercase tracking-[0.1em] text-ink/65">
            <p>რეგისტრაცია: {user ? formatDate(user.createdAt, 'long') : '—'}</p>
            <p>ბოლო შესვლა: {user?.lastLoginAt ? timeAgo(user.lastLoginAt) : '—'}</p>
          </div>
        </section>

        <section className="border border-ink/10 p-5 md:p-6">
          <h2 className="font-display text-2xl font-light">პაროლის შეცვლა</h2>
          <form onSubmit={savePassword} className="mt-5 space-y-5">
            <Input label="მიმდინარე პაროლი" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} error={passwordErrors.currentPassword} autoComplete="current-password" required />
            <Input label="ახალი პაროლი" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} error={passwordErrors.newPassword} autoComplete="new-password" required hint="8+ სიმბოლო, ასო და ციფრი" />
            <Input label="გაიმეორეთ პაროლი" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} error={passwordErrors.confirmPassword} autoComplete="new-password" required />
            <Button type="submit" variant="outline" size="sm" loading={passwordSaving}>პაროლის განახლება</Button>
          </form>
          <div className="mt-8 border-t border-ink/10 pt-5">
            <InlineNotice tone="neutral">პაროლის შეცვლის შემდეგ სხვა მოწყობილობებზე აქტიური სესიები უქმდება.</InlineNotice>
            <button type="button" onClick={() => void logout()} className="mt-5 text-[9px] uppercase tracking-[0.14em] text-[#8f3f3f] underline underline-offset-4 hover:opacity-70">
              სისტემიდან გასვლა
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
