import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Database,
  Globe2,
  LockKeyhole,
  Mail,
  MapPin,
  RotateCcw,
  Save,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { errorMessage } from '@/lib/errors';
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminModal,
  AdminPageHeader,
  AdminPanel,
  AdminSelect,
  AdminTextarea,
} from '@/components/admin/AdminUI';
import { fieldErrors, settingsSchema } from '@/lib/validation';
import { formatDateTime, formatMoney, moneyToInput, parseMoneyInput } from '@/lib/utils';
import type { StoreSettings } from '@/lib/types';

interface SettingsForm {
  storeName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  freeShippingThreshold: string;
  standardShippingFee: string;
  expressShippingFee: string;
  codEnabled: boolean;
  codInstructions: string;
  lowStockThreshold: string;
  announcement: string;
  instagramUrl: string;
  facebookUrl: string;
}

function toForm(settings: StoreSettings): SettingsForm {
  return {
    storeName: settings.storeName,
    tagline: settings.tagline,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    address: settings.address,
    freeShippingThreshold: moneyToInput(settings.freeShippingThreshold),
    standardShippingFee: moneyToInput(settings.standardShippingFee),
    expressShippingFee: moneyToInput(settings.expressShippingFee),
    codEnabled: settings.codEnabled,
    codInstructions: settings.codInstructions,
    lowStockThreshold: String(settings.lowStockThreshold),
    announcement: settings.announcement,
    instagramUrl: settings.instagramUrl,
    facebookUrl: settings.facebookUrl,
  };
}

export function AdminSettingsPage() {
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const [form, setForm] = useState<SettingsForm>(() => toForm(snapshot.settings));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setForm(toForm(snapshot.settings));
  }, [snapshot.settings.updatedAt]);

  const save = async () => {
    const payload: Partial<StoreSettings> = {
      storeName: form.storeName.trim(),
      tagline: form.tagline.trim(),
      supportEmail: form.supportEmail.trim(),
      supportPhone: form.supportPhone.trim(),
      address: form.address.trim(),
      freeShippingThreshold: parseMoneyInput(form.freeShippingThreshold),
      standardShippingFee: parseMoneyInput(form.standardShippingFee),
      expressShippingFee: parseMoneyInput(form.expressShippingFee),
      codEnabled: form.codEnabled,
      codInstructions: form.codInstructions.trim(),
      lowStockThreshold: Number(form.lowStockThreshold) || 0,
      announcement: form.announcement.trim(),
      instagramUrl: form.instagramUrl.trim(),
      facebookUrl: form.facebookUrl.trim(),
    };
    const parsed = settingsSchema.safeParse({ ...snapshot.settings, ...payload });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast('შეამოწმეთ ველები', { variant: 'error' });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await backend.saveSettings(payload);
      toast('პარამეტრები შენახულია', { message: 'ცვლილებები უკვე აისახა მაღაზიაში.', variant: 'success' });
    } catch (error) {
      toast('ვერ შეინახა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const resetDemo = async () => {
    setResetting(true);
    try {
      await backend.resetDemo();
      toast('დემო მონაცემები აღდგა', { message: 'გადახვალთ ავტორიზაციაზე.', variant: 'info' });
      navigate('/auth?mode=login');
    } catch (error) {
      toast('ვერ აღდგა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="სისტემა"
        title="პარამეტრები"
        description="მაღაზიის იდენტობა, მიწოდება, COD და ოპერაციული ზღვრები. ცვლილებები დაუყოვნებლივ აისახება storefront-ზე."
        actions={<AdminButton size="sm" loading={saving} leftIcon={<Save className="h-3.5 w-3.5" aria-hidden />} onClick={() => void save()}>შენახვა</AdminButton>}
      />

      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <AdminPanel title="მაღაზიის იდენტობა" eyebrow="ბრენდი" action={<ShoppingBag className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput label="მაღაზიის სახელი" required value={form.storeName} onChange={(event) => setForm({ ...form, storeName: event.target.value })} error={errors.storeName} />
              <AdminInput label="სლოგანი" required value={form.tagline} onChange={(event) => setForm({ ...form, tagline: event.target.value })} error={errors.tagline} />
              <AdminField label="განცხადება (announcement)" hint={`${form.announcement.length}/160`} error={errors.announcement} className="sm:col-span-2">
                <AdminTextarea aria-label="განცხადება" value={form.announcement} onChange={(event) => setForm({ ...form, announcement: event.target.value })} rows={2} maxLength={160} placeholder="უფასო მიწოდება ₾300-დან…" />
              </AdminField>
            </div>
          </AdminPanel>

          <AdminPanel title="კონტაქტი" eyebrow="მომხმარებლის მხარდაჭერა" action={<Mail className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput label="მხარდაჭერის ელფოსტა" type="email" required value={form.supportEmail} onChange={(event) => setForm({ ...form, supportEmail: event.target.value })} error={errors.supportEmail} />
              <AdminInput label="მხარდაჭერის ტელეფონი" required value={form.supportPhone} onChange={(event) => setForm({ ...form, supportPhone: event.target.value })} error={errors.supportPhone} />
              <AdminInput label="მისამართი" required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} error={errors.address} className="sm:col-span-2" />
            </div>
          </AdminPanel>

          <AdminPanel title="მიწოდება და გადახდა" eyebrow="კომერცია" action={<Truck className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden />}>
            <div className="grid gap-4 sm:grid-cols-3">
              <AdminInput label="უფასო მიწოდება ₾-დან" inputMode="decimal" value={form.freeShippingThreshold} onChange={(event) => setForm({ ...form, freeShippingThreshold: event.target.value })} error={errors.freeShippingThreshold} hint={formatMoney(parseMoneyInput(form.freeShippingThreshold))} />
              <AdminInput label="სტანდარტული (₾)" inputMode="decimal" value={form.standardShippingFee} onChange={(event) => setForm({ ...form, standardShippingFee: event.target.value })} error={errors.standardShippingFee} hint={formatMoney(parseMoneyInput(form.standardShippingFee))} />
              <AdminInput label="ექსპრეს (₾)" inputMode="decimal" value={form.expressShippingFee} onChange={(event) => setForm({ ...form, expressShippingFee: event.target.value })} error={errors.expressShippingFee} hint={formatMoney(parseMoneyInput(form.expressShippingFee))} />
            </div>
            <div className="mt-4 rounded-lg border border-[var(--line)] p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={form.codEnabled} onChange={(event) => setForm({ ...form, codEnabled: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#c6aa82]" />
                <span>
                  <span className="block text-[11px] font-medium text-[var(--text-primary)]">გადახდა მიღებისას (COD)</span>
                  <span className="mt-0.5 block text-[9px] leading-relaxed text-[var(--text-secondary)]">გამორთვისას ახალი შეკვეთების გაფორმება შეუძლებელი იქნება.</span>
                </span>
              </label>
              <AdminField label="COD ინსტრუქცია" error={errors.codInstructions} className="mt-3">
                <AdminTextarea aria-label="COD ინსტრუქცია" value={form.codInstructions} onChange={(event) => setForm({ ...form, codInstructions: event.target.value })} rows={3} maxLength={600} />
              </AdminField>
            </div>
          </AdminPanel>

          <AdminPanel title="ოპერაციული პარამეტრები" eyebrow="მარაგი" action={<Database className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput label="დაბალი მარაგის ზღვარი" type="number" min={0} value={form.lowStockThreshold} onChange={(event) => setForm({ ...form, lowStockThreshold: event.target.value })} error={errors.lowStockThreshold} hint="ნაგულისხმევი ზღვარი ახალი პროდუქტებისთვის" />
              <div className="rounded-lg border border-[var(--line)] p-3 text-[9px] leading-relaxed text-[var(--text-secondary)]">
                ზღვარი გამოიყენება მარაგის გაფრთხილებებისთვის. პროდუქტს შეიძლება ჰქონდეს ინდივიდუალური ზღვარი რედაქტორში.
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="სოციალური არხები" eyebrow="ბმულები" action={<Globe2 className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput label="Instagram URL" type="url" value={form.instagramUrl} onChange={(event) => setForm({ ...form, instagramUrl: event.target.value })} error={errors.instagramUrl} placeholder="https://instagram.com/…" />
              <AdminInput label="Facebook URL" type="url" value={form.facebookUrl} onChange={(event) => setForm({ ...form, facebookUrl: event.target.value })} error={errors.facebookUrl} placeholder="https://facebook.com/…" />
            </div>
          </AdminPanel>

          <div className="flex justify-end">
            <AdminButton loading={saving} leftIcon={<Save className="h-3.5 w-3.5" aria-hidden />} onClick={() => void save()}>ყველა ცვლილების შენახვა</AdminButton>
          </div>
        </div>

        <div className="space-y-3">
          <AdminPanel title="მიმდინარე კონფიგურაცია" eyebrow="შეჯამება">
            <dl className="space-y-2.5 text-[10px]">
              <div className="flex items-center justify-between gap-3"><dt className="text-[var(--text-secondary)]">უფასო მიწოდება</dt><dd>{formatMoney(snapshot.settings.freeShippingThreshold)}-დან</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-[var(--text-secondary)]">სტანდარტული</dt><dd>{formatMoney(snapshot.settings.standardShippingFee)}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-[var(--text-secondary)]">ექსპრეს</dt><dd>{formatMoney(snapshot.settings.expressShippingFee)}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-[var(--text-secondary)]">COD</dt><dd className={snapshot.settings.codEnabled ? 'text-[var(--tone-success-text)]' : 'text-[var(--tone-danger-text)]'}>{snapshot.settings.codEnabled ? 'ჩართული' : 'გამორთული'}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-[var(--text-secondary)]">ბოლო განახლება</dt><dd className="text-right">{formatDateTime(snapshot.settings.updatedAt)}</dd></div>
            </dl>
            <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-hover)]/50 p-3 text-[9px] leading-relaxed text-[var(--text-secondary)]">
              <p className="flex items-center gap-1.5 text-[var(--text-primary)]"><LockKeyhole className="h-3 w-3" aria-hidden /> ბექენდი: {snapshot.backendMode === 'demo' ? 'დემო (ლოკალური)' : 'Firebase'}</p>
              <p className="mt-1.5">ფასები ინახება თეთრებში. ყველა ჯამი სერვერზე გადამოწმდება შეკვეთის შექმნისას.</p>
            </div>
          </AdminPanel>

          <AdminPanel title="მიწოდების ზონები" eyebrow="ოპერაციული ცნობარი">
            <ul className="space-y-2.5 text-[10px] text-[var(--text-secondary)]">
              <li className="flex gap-2"><MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /><span>სტანდარტული: 2–4 სამუშაო დღე თბილისში, 3–6 დღე რეგიონებში.</span></li>
              <li className="flex gap-2"><Truck className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /><span>ექსპრეს: 1 სამუშაო დღე თბილისის მასშტაბით.</span></li>
              <li className="flex gap-2"><ShoppingBag className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /><span>მიწოდება უფასოა ზღვარზე მეტი ღირებულების შეკვეთებზე.</span></li>
            </ul>
          </AdminPanel>

          <AdminPanel title="დემო გარემო" eyebrow="საშიში ზონა">
            <p className="text-[10px] leading-relaxed text-[var(--text-secondary)]">
              დემო რეჟიმში მონაცემები ინახება ამ ბრაუზერში. აღდგენა წაშლის ყველა ცვლილებას — პროდუქტებს, შეკვეთებს, მომხმარებლებსა და პარამეტრებს — და დაგაბრუნებთ საწყის მონაცემებზე.
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#a04a4a]/25 bg-[#a04a4a]/[0.05] p-2.5 text-[9px] leading-relaxed text-[var(--tone-danger-text)]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              ეს მოქმედება შეუქცევადია.
            </div>
            <AdminButton variant="danger" size="sm" className="mt-3" leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />} onClick={() => setResetOpen(true)}>დემოს აღდგენა</AdminButton>
          </AdminPanel>
        </div>
      </div>

      <AdminModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="დემო მონაცემების აღდგენა"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setResetOpen(false)} disabled={resetting}>გაუქმება</AdminButton>
            <AdminButton variant="danger" loading={resetting} onClick={() => void resetDemo()}>დიახ, აღვადგინოთ</AdminButton>
          </div>
        }
      >
        <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
          ყველა ლოკალური ცვლილება წაიშლება და დაბრუნდება საწყისი დემო მონაცემები. ადმინისტრატორის სესიაც დასრულდება.
        </p>
      </AdminModal>
    </div>
  );
}
