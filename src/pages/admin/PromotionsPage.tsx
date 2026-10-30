import { useMemo, useState } from 'react';
import { CalendarClock, Copy, Pencil, Plus, Tag, Trash2, TrendingUp } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { errorMessage } from '@/lib/errors';
import {
  AdminButton,
  AdminChip,
  AdminEmpty,
  AdminField,
  AdminInput,
  AdminModal,
  AdminPageHeader,
  AdminPanel,
  AdminSearch,
  AdminSelect,
  AdminStat,
  AdminTextarea,
  MoneyText,
} from '@/components/admin/AdminUI';
import { fieldErrors, promotionSchema } from '@/lib/validation';
import { formatDate, formatMoney, parseMoneyInput, moneyToInput, toDateInputValue } from '@/lib/utils';
import type { Promotion, PromotionDraft } from '@/lib/types';

function promoState(promotion: Promotion): 'active' | 'scheduled' | 'expired' | 'paused' {
  if (!promotion.active) return 'paused';
  const now = Date.now();
  if (new Date(promotion.startsAt).getTime() > now) return 'scheduled';
  if (new Date(promotion.endsAt).getTime() < now) return 'expired';
  return 'active';
}

const STATE_LABELS = {
  active: 'აქტიური',
  scheduled: 'დაგეგმილი',
  expired: 'ვადაგასული',
  paused: 'გამორთული',
};

interface FormState {
  code: string;
  description: string;
  type: 'percent' | 'fixed';
  value: string;
  minOrder: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perUserLimit: string;
  active: boolean;
}

function emptyForm(): FormState {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 30);
  return {
    code: '',
    description: '',
    type: 'percent',
    value: '10',
    minOrder: '0',
    startsAt: toDateInputValue(now.toISOString()),
    endsAt: toDateInputValue(end.toISOString()),
    usageLimit: '0',
    perUserLimit: '1',
    active: true,
  };
}

function formFromPromotion(promotion: Promotion): FormState {
  return {
    code: promotion.code,
    description: promotion.description,
    type: promotion.type,
    value: promotion.type === 'percent' ? String(promotion.value) : moneyToInput(promotion.value),
    minOrder: moneyToInput(promotion.minOrder),
    startsAt: toDateInputValue(promotion.startsAt),
    endsAt: toDateInputValue(promotion.endsAt),
    usageLimit: String(promotion.usageLimit),
    perUserLimit: String(promotion.perUserLimit),
    active: promotion.active,
  };
}

export function AdminPromotionsPage({ canManage = true }: { canManage?: boolean }) {
  const snapshot = useBackendSnapshot();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'expired'>('all');
  const [editing, setEditing] = useState<Promotion | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Promotion | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const usage = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number; discount: number }>();
    for (const order of snapshot.orders) {
      if (!order.promoId || order.status === 'cancelled') continue;
      const entry = map.get(order.promoId) ?? { orders: 0, revenue: 0, discount: 0 };
      entry.orders += 1;
      entry.revenue += order.total;
      entry.discount += order.discountTotal;
      map.set(order.promoId, entry);
    }
    return map;
  }, [snapshot.orders]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return snapshot.promotions.filter((promotion) => {
      const state = promoState(promotion);
      if (filter === 'active' && state !== 'active' && state !== 'scheduled') return false;
      if (filter === 'paused' && state !== 'paused') return false;
      if (filter === 'expired' && state !== 'expired') return false;
      if (!query) return true;
      return promotion.code.toLowerCase().includes(query) || promotion.description.toLowerCase().includes(query);
    });
  }, [snapshot.promotions, search, filter]);

  const activeCount = snapshot.promotions.filter((promotion) => promoState(promotion) === 'active').length;
  const totalRedemptions = snapshot.promotions.reduce((total, promotion) => total + promotion.usageCount, 0);
  const totalDiscount = [...usage.values()].reduce((total, entry) => total + entry.discount, 0);

  const openNew = () => {
    setForm(emptyForm());
    setErrors({});
    setEditing('new');
  };

  const openEdit = (promotion: Promotion) => {
    setForm(formFromPromotion(promotion));
    setErrors({});
    setEditing(promotion);
  };

  const save = async () => {
    const draft: PromotionDraft = {
      id: editing && editing !== 'new' ? editing.id : undefined,
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      type: form.type,
      value: form.type === 'percent' ? Number(form.value) : parseMoneyInput(form.value),
      minOrder: parseMoneyInput(form.minOrder),
      startsAt: new Date(`${form.startsAt}T00:00:00`).toISOString(),
      endsAt: new Date(`${form.endsAt}T23:59:59`).toISOString(),
      usageLimit: Number(form.usageLimit) || 0,
      perUserLimit: Number(form.perUserLimit) || 0,
      active: form.active,
    };
    const parsed = promotionSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await backend.savePromotion(draft);
      toast(editing === 'new' ? 'პრომოკოდი შეიქმნა' : 'პრომოკოდი განახლდა', { message: draft.code });
      setEditing(null);
    } catch (error) {
      toast('ვერ შეინახა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (promotion: Promotion) => {
    try {
      await backend.savePromotion({
        id: promotion.id,
        code: promotion.code,
        description: promotion.description,
        type: promotion.type,
        value: promotion.value,
        minOrder: promotion.minOrder,
        startsAt: promotion.startsAt,
        endsAt: promotion.endsAt,
        usageLimit: promotion.usageLimit,
        perUserLimit: promotion.perUserLimit,
        active: !promotion.active,
      });
      toast(promotion.active ? 'პრომოკოდი გამოირთო' : 'პრომოკოდი ჩაირთო', { message: promotion.code });
    } catch (error) {
      toast('ვერ შეიცვალა', { message: errorMessage(error), variant: 'error' });
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await backend.deletePromotion(deleting.id);
      toast('პრომოკოდი წაიშალა', { message: deleting.code, variant: 'info' });
      setDeleting(null);
    } catch (error) {
      toast('ვერ წაიშალა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="მარკეტინგი"
        title="პრომოკოდები"
        description="შექმენით და მართეთ ფასდაკლების კამპანიები. კოდები ხელმისაწვდომია MAKU-ს ორივე ვერსიაში."
        actions={canManage && <AdminButton size="sm" leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden />} onClick={openNew}>ახალი პრომოკოდი</AdminButton>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStat label="აქტიური კოდები" value={activeCount} sub={`${snapshot.promotions.length} საერთო`} icon={<Tag className="h-4 w-4" aria-hidden />} />
        <AdminStat label="გამოყენება" value={totalRedemptions} sub="შეკვეთებში" icon={<TrendingUp className="h-4 w-4" aria-hidden />} accent="success" />
        <AdminStat label="გაცემული ფასდაკლება" value={formatMoney(totalDiscount)} sub="წარმატებული შეკვეთებით" icon={<CalendarClock className="h-4 w-4" aria-hidden />} accent="warning" />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3 sm:flex-row sm:items-center">
        <AdminSearch value={search} onChange={setSearch} placeholder="ძიება კოდით ან აღწერით…" className="sm:w-72" />
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
          {(['all', 'active', 'paused', 'expired'] as const).map((entry) => (
            <AdminChip key={entry} active={filter === entry} onClick={() => setFilter(entry)}>
              {entry === 'all' ? 'ყველა' : entry === 'active' ? 'აქტიური' : entry === 'paused' ? 'გამორთული' : 'ვადაგასული'}
            </AdminChip>
          ))}
        </div>
      </div>

      {!visible.length ? (
        <AdminEmpty title="პრომოკოდები არ მოიძებნა" description="შეცვალეთ ფილტრი ან შექმენით ახალი კამპანია." action={canManage ? <AdminButton size="sm" onClick={openNew}>ახალი პრომოკოდი</AdminButton> : undefined} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((promotion) => {
            const state = promoState(promotion);
            const stats = usage.get(promotion.id) ?? { orders: 0, revenue: 0, discount: 0 };
            const progress = promotion.usageLimit ? Math.min(100, Math.round((promotion.usageCount / promotion.usageLimit) * 100)) : 0;
            return (
              <AdminPanel key={promotion.id} className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[14px] font-semibold tracking-[0.08em] text-[var(--tone-accent-text)]">{promotion.code}</span>
                      <span
                        className={
                          state === 'active'
                            ? 'rounded border border-[#4d7a60]/35 bg-[#4d7a60]/12 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-[var(--tone-success-text)]'
                            : state === 'scheduled'
                              ? 'rounded border border-[#6f96a6]/30 bg-[#6f96a6]/10 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-[var(--tone-info-text)]'
                              : state === 'expired'
                                ? 'rounded border border-[var(--line)] bg-[var(--surface-hover)] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-[var(--text-secondary)]'
                                : 'rounded border border-[#b88a43]/35 bg-[#b88a43]/10 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-[var(--tone-warning-text)]'
                        }
                      >
                        {STATE_LABELS[state]}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">{promotion.description}</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c6aa82]/25 bg-[#c6aa82]/[0.06] text-[11px] font-medium text-[var(--tone-accent-text)]">
                    {promotion.type === 'percent' ? `${promotion.value}%` : formatMoney(promotion.value, { compact: true })}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-[9px] text-[var(--text-secondary)]">
                  <div className="rounded-lg border border-[var(--line)] px-2.5 py-2">
                    <p className="uppercase tracking-[0.08em]">მინ. შეკვეთა</p>
                    <p className="mt-1 text-[10px] tabular-nums text-[var(--text-primary)]">{promotion.minOrder ? formatMoney(promotion.minOrder) : '—'}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--line)] px-2.5 py-2">
                    <p className="uppercase tracking-[0.08em]">გამოყენება</p>
                    <p className="mt-1 text-[10px] tabular-nums text-[var(--text-primary)]">{promotion.usageCount}{promotion.usageLimit ? ` / ${promotion.usageLimit}` : ''}</p>
                  </div>
                </div>
                {promotion.usageLimit > 0 && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                    <div className="h-full rounded-full bg-[#c6aa82]" style={{ width: `${Math.max(2, progress)}%` }} />
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3 text-[9px] text-[var(--text-secondary)]">
                  <span>{formatDate(promotion.startsAt)} — {formatDate(promotion.endsAt)}</span>
                  <span className="tabular-nums">{stats.orders} შეკვეთა</span>
                </div>

                {canManage && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <AdminButton size="sm" variant="secondary" leftIcon={<Pencil className="h-3 w-3" aria-hidden />} onClick={() => openEdit(promotion)}>რედაქტირება</AdminButton>
                    <AdminButton size="sm" variant="ghost" onClick={() => void toggle(promotion)}>{promotion.active ? 'გამორთვა' : 'ჩართვა'}</AdminButton>
                    <AdminButton size="icon" variant="ghost" aria-label="კოდის კოპირება" onClick={() => void navigator.clipboard?.writeText(promotion.code).then(() => toast('კოდი დაკოპირდა', { message: promotion.code, variant: 'success' }))}>
                      <Copy className="h-3 w-3" aria-hidden />
                    </AdminButton>
                    <AdminButton size="icon" variant="ghost" aria-label="წაშლა" onClick={() => setDeleting(promotion)}>
                      <Trash2 className="h-3 w-3 text-[var(--tone-danger-text)]" aria-hidden />
                    </AdminButton>
                  </div>
                )}
              </AdminPanel>
            );
          })}
        </div>
      )}

      <AdminModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'ახალი პრომოკოდი' : 'პრომოკოდის რედაქტირება'}
        description="კოდი ავტომატურად გადაიქცევა დიდ ასოებად. კოდის პირობები შეკვეთის გაგზავნამდე მოწმდება."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setEditing(null)} disabled={saving}>გაუქმება</AdminButton>
            <AdminButton loading={saving} onClick={() => void save()}>შენახვა</AdminButton>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminInput label="კოდი" required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} error={errors.code} placeholder="MAKU15" />
          <AdminSelect label="ტიპი" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as FormState['type'] })}>
            <option value="percent">პროცენტული</option>
            <option value="fixed">ფიქსირებული თანხა</option>
          </AdminSelect>
          <AdminField label="აღწერა" required error={errors.description} className="sm:col-span-2">
            <AdminTextarea aria-label="აღწერა" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} maxLength={120} placeholder="მაგ. ატელიეს კლუბი — 20% ფასდაკლება" />
          </AdminField>
          <AdminInput
            label={form.type === 'percent' ? 'პროცენტი' : 'თანხა (₾)'}
            required
            inputMode="decimal"
            value={form.value}
            onChange={(event) => setForm({ ...form, value: event.target.value })}
            error={errors.value}
            hint={form.type === 'fixed' ? formatMoney(parseMoneyInput(form.value)) : undefined}
          />
          <AdminInput
            label="მინიმალური შეკვეთა (₾)"
            inputMode="decimal"
            value={form.minOrder}
            onChange={(event) => setForm({ ...form, minOrder: event.target.value })}
            error={errors.minOrder}
            hint={formatMoney(parseMoneyInput(form.minOrder))}
          />
          <AdminInput label="დაწყება" type="date" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} error={errors.startsAt} />
          <AdminInput label="დასრულება" type="date" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} error={errors.endsAt} />
          <AdminInput label="საერთო ლიმიტი" type="number" min={0} value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} error={errors.usageLimit} hint="0 = ულიმიტო" />
          <AdminInput label="ლიმიტი მომხმარებელზე" type="number" min={0} value={form.perUserLimit} onChange={(event) => setForm({ ...form, perUserLimit: event.target.value })} error={errors.perUserLimit} hint="0 = ულიმიტო" />
          <label className="flex items-center gap-3 rounded-lg border border-[var(--line)] p-3 sm:col-span-2">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4 accent-[#c6aa82]" />
            <span>
              <span className="block text-[11px] text-[var(--text-primary)]">პრომოკოდი აქტიურია</span>
              <span className="mt-0.5 block text-[9px] text-[var(--text-secondary)]">გამორთული კოდი ვერ გამოიყენება შეკვეთის გაფორმებისას.</span>
            </span>
          </label>
        </div>
      </AdminModal>

      <AdminModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="პრომოკოდის წაშლა"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setDeleting(null)} disabled={deleteLoading}>გაუქმება</AdminButton>
            <AdminButton variant="danger" loading={deleteLoading} onClick={() => void remove()}>წაშლა</AdminButton>
          </div>
        }
      >
        <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
          წაშალოთ პრომოკოდი <span className="font-mono text-[var(--text-primary)]">{deleting?.code}</span>? უკვე გაფორმებული შეკვეთები შეინარჩუნებს ისტორიულ ფასდაკლებას.
        </p>
      </AdminModal>
    </div>
  );
}
