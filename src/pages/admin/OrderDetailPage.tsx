import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCopy,
  CreditCard,
  MapPin,
  MessageSquarePlus,
  Package,
  Printer,
  ShoppingBag,
  Truck,
  UserRound,
} from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { errorMessage } from '@/lib/errors';
import {
  AdminButton,
  AdminEmpty,
  AdminField,
  AdminModal,
  AdminPanel,
  AdminSelect,
  AdminTextarea,
  MoneyText,
  OrderStatusPill,
} from '@/components/admin/AdminUI';
import { SafeImage } from '@/components/ui/SafeImage';
import { ORDER_STATUS_HINTS, ORDER_STATUS_LABELS, ORDER_TRANSITIONS, DELIVERY_METHOD_LABELS } from '@/lib/constants';
import { copyText, formatDateTime, formatMoney, getFullName } from '@/lib/utils';
import type { Order, OrderStatus } from '@/lib/types';

const PAYMENT_LABELS: Record<Order['paymentStatus'], string> = {
  unpaid: 'გადაუხდელი',
  paid: 'გადახდილი',
  refunded: 'დაბრუნებული',
};

export function AdminOrderDetailPage({ basePath = '/admin', managerMode = false }: { basePath?: string; managerMode?: boolean }) {
  const { orderId } = useParams();
  const snapshot = useBackendSnapshot();
  const order = snapshot.orders.find((entry) => entry.id === orderId);
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [note, setNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const transitions = useMemo(() => (order ? ORDER_TRANSITIONS[order.status] : []), [order]);
  const itemCount = order?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  if (!order) {
    return (
      <div className="space-y-5">
        <AdminButton variant="secondary" size="sm" leftIcon={<ArrowLeft className="h-3.5 w-3.5" aria-hidden />} onClick={() => history.back()}>
          უკან
        </AdminButton>
        <AdminEmpty
          title="შეკვეთა ვერ მოიძებნა"
          description="შესაძლოა შეკვეთა წაშლილია ან ბმული არასწორია."
          action={<Link to={`${basePath}/orders`}><AdminButton size="sm">შეკვეთების სია</AdminButton></Link>}
        />
      </div>
    );
  }

  const applyStatus = async () => {
    if (!nextStatus) {
      toast('აირჩიეთ სტატუსი', { variant: 'error' });
      return;
    }
    if (nextStatus === 'cancelled') {
      setCancelOpen(true);
      return;
    }
    setUpdating(true);
    try {
      await backend.updateOrderStatus(order.id, nextStatus, statusNote.trim() || undefined);
      toast('სტატუსი განახლდა', { message: `შეკვეთა ${order.number} — ${ORDER_STATUS_LABELS[nextStatus]}.` });
      setNextStatus('');
      setStatusNote('');
    } catch (error) {
      toast('სტატუსი ვერ შეიცვალა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const cancelOrder = async () => {
    setUpdating(true);
    try {
      await backend.updateOrderStatus(order.id, 'cancelled', statusNote.trim() || 'შეკვეთა გაუქმდა ადმინისტრაციის მიერ.');
      toast('შეკვეთა გაუქმდა', { message: 'მარაგი დაუბრუნდა პროდუქტებს.', variant: 'info' });
      setCancelOpen(false);
      setNextStatus('');
      setStatusNote('');
    } catch (error) {
      toast('ვერ გაუქმდა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setAddingNote(true);
    try {
      await backend.addOrderNote(order.id, note);
      setNote('');
      toast('შენიშვნა დაემატა', { variant: 'success' });
    } catch (error) {
      toast('შენიშვნა ვერ დაემატა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <Link to={`${basePath}/orders`} className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
            <ArrowLeft className="h-3 w-3" aria-hidden /> შეკვეთები
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-medium tracking-[-0.02em] text-[var(--text-primary)]">{order.number}</h1>
            <OrderStatusPill status={order.status} />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
            {formatDateTime(order.createdAt)} · {itemCount} ნივთი · {getFullName(order.customer)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminButton
            variant="secondary"
            size="sm"
            leftIcon={<ClipboardCopy className="h-3.5 w-3.5" aria-hidden />}
            onClick={() => void copyText(`${order.number} · ${getFullName(order.customer)} · ${formatMoney(order.total)}`).then(() => toast('დაკოპირდა', { variant: 'success' }))}
          >
            კოპირება
          </AdminButton>
          <AdminButton variant="secondary" size="sm" leftIcon={<Printer className="h-3.5 w-3.5" aria-hidden />} onClick={() => window.print()}>
            ბეჭდვა
          </AdminButton>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-3">
          <AdminPanel title="შეკვეთის შემადგენლობა" eyebrow={`${order.items.length} პოზიცია`} noPadding>
            <ul className="divide-y divide-[var(--line)]">
              {order.items.map((item) => (
                <li key={`${item.productId}-${item.variantId}`} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                  <Link to={`${basePath === '/manager' ? '/product' : '/product'}/${item.productSlug}`} className="relative h-16 w-14 shrink-0 overflow-hidden bg-[var(--surface-hover)]" target="_blank" rel="noreferrer">
                    <SafeImage source={item.image} alt={item.productName} width={160} className="h-full w-full object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-[var(--text-primary)]">{item.productName}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">{item.variantLabel}</p>
                    <p className="mt-1 font-mono text-[9px] text-[var(--text-secondary)]">{item.sku}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <MoneyText value={item.lineTotal} className="text-[11px] font-medium" />
                    <p className="mt-0.5 text-[9px] text-[var(--text-secondary)]">{item.quantity} × {formatMoney(item.unitPrice)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </AdminPanel>

          <div className="grid gap-3 md:grid-cols-2">
            <AdminPanel title="მომხმარებელი" eyebrow="კონტაქტი">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c6aa82]/12 text-[var(--tone-accent-text)]">
                  <UserRound className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 text-[11px]">
                  <p className="font-medium text-[var(--text-primary)]">{getFullName(order.customer)}</p>
                  <a href={`mailto:${order.customer.email}`} className="mt-1 block truncate text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{order.customer.email}</a>
                  <a href={`tel:${order.customer.phone}`} className="mt-0.5 block text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{order.customer.phone}</a>
                </div>
              </div>
            </AdminPanel>

            <AdminPanel title="მიწოდების მისამართი" eyebrow={DELIVERY_METHOD_LABELS[order.deliveryMethod]}>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tone-accent-text)]" aria-hidden />
                <div className="text-[11px] leading-relaxed">
                  <p className="text-[var(--text-primary)]">{order.address.city}, {order.address.street}</p>
                  {order.address.apartment && <p className="text-[10px] text-[var(--text-secondary)]">{order.address.apartment}</p>}
                  {order.address.postalCode && <p className="text-[10px] text-[var(--text-secondary)]">{order.address.postalCode}</p>}
                  <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{order.address.firstName} {order.address.lastName} · {order.address.phone}</p>
                </div>
              </div>
            </AdminPanel>
          </div>

          <AdminPanel title="შიდა შენიშვნები" eyebrow="გუნდისთვის" action={<MessageSquarePlus className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden />}>
            <div className="space-y-2">
              <AdminTextarea
                aria-label="შიდა შენიშვნა"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="მაგ. დაუკავშირდით მომხმარებელს მისამართის დასაზუსტებლად…"
                rows={2}
                maxLength={1000}
              />
              <div className="flex justify-end">
                <AdminButton size="sm" loading={addingNote} onClick={() => void addNote()} disabled={!note.trim()}>
                  შენიშვნის დამატება
                </AdminButton>
              </div>
            </div>
            <ul className="mt-4 space-y-3 border-t border-[var(--line)] pt-4">
              {[...order.internalNotes].reverse().map((entry) => (
                <li key={entry.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface-hover)]/50 p-3">
                  <p className="text-[10px] leading-relaxed text-[var(--text-primary)]">{entry.text}</p>
                  <p className="mt-1.5 text-[8px] text-[var(--text-secondary)]">{entry.authorName} · {formatDateTime(entry.createdAt)}</p>
                </li>
              ))}
              {!order.internalNotes.length && <li className="py-3 text-center text-[10px] text-[var(--text-secondary)]">შიდა შენიშვნები არ არის.</li>}
            </ul>
          </AdminPanel>
        </div>

        <div className="space-y-3">
          <AdminPanel title="სტატუსის მართვა" eyebrow="ოპერაციული ნაბიჯი">
            {transitions.length ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-[#c6aa82]/20 bg-[#c6aa82]/[0.05] p-3">
                  <p className="text-[10px] leading-relaxed text-[var(--text-secondary)]">
                    მიმდინარე: <span className="text-[var(--text-primary)]">{ORDER_STATUS_LABELS[order.status]}</span>. {ORDER_STATUS_HINTS[order.status]}.
                  </p>
                </div>
                <AdminSelect label="შემდეგი სტატუსი" value={nextStatus} onChange={(event) => setNextStatus(event.target.value as OrderStatus)}>
                  <option value="">აირჩიეთ სტატუსი…</option>
                  {transitions.map((status) => (
                    <option key={status} value={status}>{ORDER_STATUS_LABELS[status]}</option>
                  ))}
                </AdminSelect>
                <AdminTextarea
                  label="შენიშვნა (არასავალდებულო)"
                  value={statusNote}
                  onChange={(event) => setStatusNote(event.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="მაგ. შეკვეთა დადასტურდა ტელეფონით."
                />
                <AdminButton
                  className="w-full"
                  loading={updating}
                  onClick={() => void applyStatus()}
                  disabled={!nextStatus}
                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
                >
                  სტატუსის განახლება
                </AdminButton>
              </div>
            ) : (
              <p className="rounded-lg border border-[var(--line)] bg-[var(--surface-hover)]/60 p-3 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                შეკვეთა საბოლოო სტატუსშია — „{ORDER_STATUS_LABELS[order.status]}“. შემდგომი ცვლილება შეუძლებელია.
              </p>
            )}
          </AdminPanel>

          <AdminPanel title="ჯამები" eyebrow="ფინანსები">
            <dl className="space-y-2.5 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--text-secondary)]">ქვეჯამი</dt>
                <dd><MoneyText value={order.subtotal} /></dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--text-secondary)]">ფასდაკლება</dt>
                <dd className={order.discountTotal ? 'text-[var(--tone-success-text)]' : 'text-[var(--text-secondary)]'}>
                  {order.discountTotal ? `−${formatMoney(order.discountTotal)}` : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--text-secondary)]">მიწოდება</dt>
                <dd>{order.shippingFee ? formatMoney(order.shippingFee) : 'უფასო'}</dd>
              </div>
              {order.promoCode && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[var(--text-secondary)]">პრომოკოდი</dt>
                  <dd className="font-mono text-[10px] text-[var(--tone-accent-text)]">{order.promoCode}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
                <dt className="text-[11px] font-medium text-[var(--text-primary)]">სულ</dt>
                <dd><MoneyText value={order.total} className="text-[16px] font-medium" /></dd>
              </div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-4">
              <div className="rounded-lg border border-[var(--line)] p-2.5">
                <CreditCard className="h-3.5 w-3.5 text-[var(--text-secondary)]" aria-hidden />
                <p className="mt-1.5 text-[9px] text-[var(--text-secondary)]">გადახდა</p>
                <p className="mt-0.5 text-[10px] text-[var(--text-primary)]">{PAYMENT_LABELS[order.paymentStatus]}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] p-2.5">
                {order.deliveryMethod === 'express' ? <Truck className="h-3.5 w-3.5 text-[var(--text-secondary)]" aria-hidden /> : <Package className="h-3.5 w-3.5 text-[var(--text-secondary)]" aria-hidden />}
                <p className="mt-1.5 text-[9px] text-[var(--text-secondary)]">მიწოდება</p>
                <p className="mt-0.5 text-[10px] text-[var(--text-primary)]">{order.deliveryMethod === 'express' ? 'ექსპრეს' : 'სტანდარტული'}</p>
              </div>
            </div>
          </AdminPanel>

          {order.notes && (
            <AdminPanel title="მომხმარებლის შენიშვნა" eyebrow="შეკვეთიდან">
              <p className="text-[10px] leading-relaxed text-[var(--text-secondary)]">{order.notes}</p>
            </AdminPanel>
          )}

          <AdminPanel title="ისტორია" eyebrow="ქრონოლოგია" noPadding>
            <ol className="relative px-4 py-4">
              {[...order.timeline].reverse().map((entry, index, list) => (
                <li key={`${entry.status}-${entry.at}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < list.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-[var(--line)]" aria-hidden />}
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[var(--surface-raised)] ${entry.status === 'cancelled' ? 'bg-[#a04a4a]' : 'bg-[#c6aa82]'}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-[var(--text-primary)]">{ORDER_STATUS_LABELS[entry.status]}</p>
                    <p className="mt-0.5 text-[8px] text-[var(--text-secondary)]">{entry.by} · {formatDateTime(entry.at)}</p>
                    {entry.note && <p className="mt-1 text-[9px] leading-relaxed text-[var(--text-secondary)]">{entry.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </AdminPanel>

          {managerMode && snapshot.session?.role !== 'admin' && (
            <p className="flex items-start gap-2 px-1 text-[9px] leading-relaxed text-[var(--text-secondary)]">
              <ShoppingBag className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              მენეჯერის სამუშაო სივრცეში ხელმისაწვდომია შეკვეთის ოპერაციული მონაცემები. ფინანსური რეპორტები მხოლოდ ადმინისტრატორისთვისაა.
            </p>
          )}
        </div>
      </div>

      <AdminModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="შეკვეთის გაუქმება"
        description="გაუქმებისას პროდუქტების მარაგი ავტომატურად აღდგება."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setCancelOpen(false)} disabled={updating}>დაბრუნება</AdminButton>
            <AdminButton variant="danger" loading={updating} onClick={() => void cancelOrder()}>დაუდასტურეთ გაუქმება</AdminButton>
          </div>
        }
      >
        <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
          დარწმუნებული ხართ, რომ გსურთ შეკვეთა <strong className="text-[var(--text-primary)]">{order.number}</strong>-ის გაუქმება? ეს მოქმედება შეუქცევადია.
        </p>
        <AdminField label="გაუქმების მიზეზი" className="mt-4">
          <textarea
            aria-label="გაუქმების მიზეზი"
            value={statusNote}
            onChange={(event) => setStatusNote(event.target.value)}
            rows={2}
            maxLength={500}
            className="admin-input resize-y"
            placeholder="მაგ. მომხმარებელმა გააუქმა შეკვეთა."
          />
        </AdminField>
      </AdminModal>
    </div>
  );
}
