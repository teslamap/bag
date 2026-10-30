import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { useCartStore } from '@/state/cart';
import { useCartDetails } from '@/hooks/useCommerce';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { Seo } from '@/components/system/Seo';
import { SafeImage } from '@/components/ui/SafeImage';
import { Button } from '@/components/ui/Button';
import { Checkbox, FormError, Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState, InlineNotice } from '@/components/ui/Feedback';
import { CartDrawer } from '@/components/store/CartDrawer';
import {
  addressSchema,
  contactSchema,
  fieldErrors,
} from '@/lib/validation';
import { GEORGIAN_CITIES, DELIVERY_METHOD_HINTS, DELIVERY_METHOD_LABELS, ORDER_STATUS_LABELS } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import {
  formatDateTime,
  formatMoney,
  makeId,
  makeIdempotencyKey,
  getVariantLabel,
} from '@/lib/utils';
import type { Address, DeliveryMethod, OrderDraft } from '@/lib/types';
import { computeOrderTotals } from '@/domain/pricing';

const STEPS = [
  { id: 1, label: 'ინფორმაცია' },
  { id: 2, label: 'მიწოდება' },
  { id: 3, label: 'გადახდა' },
  { id: 4, label: 'დადასტურება' },
];

function emptyAddress(firstName = '', lastName = '', phone = ''): Address {
  return {
    id: '',
    label: 'სახლი',
    firstName,
    lastName,
    phone,
    city: 'თბილისი',
    street: '',
    apartment: '',
    postalCode: '',
    isDefault: true,
  };
}

export function CheckoutPage() {
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const { lines, subtotal, count } = useCartDetails();
  const clear = useCartStore((state) => state.clear);
  const promo = useCartStore((state) => state.promo);
  const setPromo = useCartStore((state) => state.setPromo);
  const currentUser = snapshot.users.find((user) => user.id === snapshot.session?.id);

  const [step, setStep] = useState(1);
  const [contact, setContact] = useState({
    firstName: currentUser?.firstName ?? '',
    lastName: currentUser?.lastName ?? '',
    email: currentUser?.email ?? '',
    phone: currentUser?.phone ?? '',
  });
  const [selectedAddressId, setSelectedAddressId] = useState(
    currentUser?.addresses.find((address) => address.isDefault)?.id ?? currentUser?.addresses[0]?.id ?? 'new',
  );
  const [newAddress, setNewAddress] = useState<Address>(() => emptyAddress(currentUser?.firstName, currentUser?.lastName, currentUser?.phone));
  const [saveAddress, setSaveAddress] = useState(true);
  const [delivery, setDelivery] = useState<DeliveryMethod>('standard');
  const [notes, setNotes] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [placing, setPlacing] = useState(false);
  const idempotency = useRef(makeIdempotencyKey());

  const addresses = currentUser?.addresses ?? [];
  const selectedAddress = selectedAddressId === 'new' ? newAddress : addresses.find((address) => address.id === selectedAddressId) ?? newAddress;
  const orderAddress = { ...selectedAddress, id: selectedAddress.id || makeId('addr') };
  const availableLines = lines.filter((line) => line.available);
  const hasUnavailable = lines.some((line) => !line.available);

  const totals = useMemo(() => {
    const priced = computeOrderTotals({
      lines: availableLines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.line.quantity })),
      settings: snapshot.settings,
      deliveryMethod: delivery,
    });
    const discount = promo?.discount ?? 0;
    const discounted = Math.max(0, priced.subtotal - discount);
    const rawShipping = delivery === 'express' ? snapshot.settings.expressShippingFee : discounted >= snapshot.settings.freeShippingThreshold ? 0 : snapshot.settings.standardShippingFee;
    return { subtotal: priced.subtotal, discount, shipping: rawShipping, total: discounted + rawShipping };
  }, [availableLines, snapshot.settings, delivery, promo]);

  const validateStep = (target: number) => {
    const nextErrors: Record<string, string> = {};
    if (target >= 2) {
      const contactResult = contactSchema.safeParse(contact);
      if (!contactResult.success) Object.assign(nextErrors, fieldErrors(contactResult.error));
    }
    if (target >= 3) {
      const addressResult = addressSchema.safeParse(selectedAddress);
      if (!addressResult.success) {
        for (const [key, value] of Object.entries(fieldErrors(addressResult.error))) nextErrors[`address.${key}`] = value;
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step + 1)) return;
    if (step === 2 && hasUnavailable) {
      setFormError('კალათაში არის მიუწვდომელი პროდუქტი. ამოიღეთ იგი და სცადეთ თავიდან.');
      return;
    }
    setFormError('');
    setStep((value) => Math.min(4, value + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStep((value) => Math.max(1, value - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyPromo = async () => {
    const normalized = promoInput.trim().toUpperCase();
    if (!normalized) {
      setPromoError('შეიყვანეთ პრომოკოდი.');
      return;
    }
    setPromoLoading(true);
    setPromoError('');
    try {
      const result = await backend.validatePromo(normalized, totals.subtotal);
      if (!result.valid) {
        setPromoError(result.reason ?? 'პრომოკოდი არასწორია.');
        setPromo(null);
        return;
      }
      setPromo({ code: normalized, discount: result.discount });
      setPromoInput('');
      toast('პრომოკოდი გააქტიურდა', { message: `დაზოგავთ ${formatMoney(result.discount)}-ს.` });
    } catch (error) {
      setPromoError(errorMessage(error));
    } finally {
      setPromoLoading(false);
    }
  };

  const placeOrder = async () => {
    setFormError('');
    if (!accepted) {
      setFormError('დაადასტურეთ შეკვეთის პირობები.');
      return;
    }
    if (!availableLines.length || hasUnavailable) {
      setFormError('კალათა ცარიელია ან შეიცავს მიუწვდომელ პროდუქტს.');
      return;
    }
    setPlacing(true);
    try {
      const draft: OrderDraft = {
        items: availableLines.map((line) => ({
          productId: line.product.id,
          variantId: line.variant.id,
          quantity: line.line.quantity,
        })),
        contact,
        address: orderAddress,
        deliveryMethod: delivery,
        paymentMethod: 'cod',
        promoCode: promo?.code,
        notes: notes.trim() || undefined,
        idempotencyKey: idempotency.current,
      };
      const order = await backend.createOrder(draft);
      if (saveAddress && selectedAddressId === 'new') {
        try {
          await backend.saveAddress({ ...orderAddress, isDefault: addresses.length === 0 });
        } catch {
          // The order is already placed; saving the address is a convenience only.
        }
      }
      clear();
      navigate(`/checkout/success/${order.id}`, { replace: true });
    } catch (error) {
      setFormError(errorMessage(error));
      idempotency.current = makeIdempotencyKey();
    } finally {
      setPlacing(false);
    }
  };

  if (!lines.length) {
    return (
      <div className="container-editorial py-20">
        <EmptyState
          title="კალათა ცარიელია"
          description="შეკვეთის გასაფორმებლად დაამატეთ პროდუქტი კალათაში."
          action={<Button onClick={() => navigate('/catalog')}>კოლექციაში დაბრუნება</Button>}
        />
        <CartDrawer />
      </div>
    );
  }

  return (
    <>
      <Seo title="შეკვეთის გაფორმება" noIndex description="MAKU — უსაფრთხო შეკვეთა, გადახდა მიღებისას." />
      <div className="container-editorial py-8 md:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link to="/catalog" className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-ink/65 transition-colors hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> შოპინგის გაგრძელება
          </Link>
          <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-ink/65">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> უსაფრთხო შეკვეთა
          </span>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16">
          <div>
            <p className="eyebrow">შეკვეთა</p>
            <h1 className="mt-3 font-display text-4xl font-light tracking-display md:text-5xl">გაფორმება</h1>

            <ol className="mt-8 flex items-center gap-0 border-y border-ink/10 py-4">
              {STEPS.map((entry, index) => (
                <li key={entry.id} className="flex flex-1 items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                      step > entry.id ? 'border-ink bg-ink text-ivory' : step === entry.id ? 'border-ink text-ink' : 'border-ink/15 text-ink/65'
                    }`}
                  >
                    {step > entry.id ? <Check className="h-3 w-3" aria-hidden /> : entry.id}
                  </span>
                  <span className={`hidden text-[9px] uppercase tracking-[0.12em] sm:block ${step >= entry.id ? 'text-ink/70' : 'text-ink/65'}`}>{entry.label}</span>
                  {index < STEPS.length - 1 && <span className="ml-auto hidden h-px flex-1 bg-ink/10 sm:block" aria-hidden />}
                </li>
              ))}
            </ol>

            <div className="mt-8">
              {step === 1 && (
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl font-light">კონტაქტი</h2>
                    {snapshot.session && <span className="text-[10px] text-ink/65">ავტორიზებული: {snapshot.session.email}</span>}
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input label="სახელი" value={contact.firstName} onChange={(event) => setContact({ ...contact, firstName: event.target.value })} error={errors.firstName} autoComplete="given-name" required />
                    <Input label="გვარი" value={contact.lastName} onChange={(event) => setContact({ ...contact, lastName: event.target.value })} error={errors.lastName} autoComplete="family-name" required />
                  </div>
                  <Input label="ელფოსტა" type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} error={errors.email} autoComplete="email" required />
                  <Input label="ტელეფონი" type="tel" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} error={errors.phone} autoComplete="tel" required />
                  <InlineNotice tone="neutral">შეკვეთის სტატუსისა და მიწოდების შესახებ შეტყობინებებს მიიღებთ ელფოსტაზე და პროფილში.</InlineNotice>
                </section>
              )}

              {step === 2 && (
                <section className="space-y-6">
                  <h2 className="font-display text-2xl font-light">მიწოდების მისამართი</h2>
                  {addresses.length > 0 && (
                    <div className="space-y-2">
                      {addresses.map((address) => (
                        <label
                          key={address.id}
                          className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${selectedAddressId === address.id ? 'border-ink bg-warmwhite/60' : 'border-ink/10 hover:border-ink/30'}`}
                        >
                          <input
                            type="radio"
                            name="address"
                            checked={selectedAddressId === address.id}
                            onChange={() => setSelectedAddressId(address.id)}
                            className="mt-1 h-3.5 w-3.5 accent-ink"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-[11px] font-medium">
                              {address.label}
                              {address.isDefault && <span className="text-[8px] uppercase tracking-[0.12em] text-ink/65">ნაგულისხმევი</span>}
                            </span>
                            <span className="mt-1 block text-[11px] leading-relaxed text-ink/65">
                              {address.firstName} {address.lastName} · {address.phone}<br />
                              {address.city}, {address.street}{address.apartment ? `, ${address.apartment}` : ''}
                            </span>
                          </span>
                        </label>
                      ))}
                      <label className={`flex cursor-pointer items-center gap-3 border p-4 text-[11px] transition-colors ${selectedAddressId === 'new' ? 'border-ink bg-warmwhite/60' : 'border-ink/10 hover:border-ink/30'}`}>
                        <input type="radio" name="address" checked={selectedAddressId === 'new'} onChange={() => setSelectedAddressId('new')} className="h-3.5 w-3.5 accent-ink" />
                        ახალი მისამართის დამატება
                      </label>
                    </div>
                  )}
                  {selectedAddressId === 'new' && (
                    <div className="grid gap-5 border border-ink/10 p-5 sm:grid-cols-2">
                      <Input label="მისამართის სახელი" value={newAddress.label} onChange={(event) => setNewAddress({ ...newAddress, label: event.target.value })} error={errors['address.label']} placeholder="სახლი, სამსახური…" />
                      <Input label="ტელეფონი" value={newAddress.phone} onChange={(event) => setNewAddress({ ...newAddress, phone: event.target.value })} error={errors['address.phone']} />
                      <Input label="მიმღების სახელი" value={newAddress.firstName} onChange={(event) => setNewAddress({ ...newAddress, firstName: event.target.value })} error={errors['address.firstName']} />
                      <Input label="მიმღების გვარი" value={newAddress.lastName} onChange={(event) => setNewAddress({ ...newAddress, lastName: event.target.value })} error={errors['address.lastName']} />
                      <Select
                        label="ქალაქი"
                        value={newAddress.city}
                        onChange={(event) => setNewAddress({ ...newAddress, city: event.target.value })}
                        error={errors['address.city']}
                        options={GEORGIAN_CITIES.map((city) => ({ value: city, label: city }))}
                      />
                      <Input label="საფოსტო ინდექსი" value={newAddress.postalCode ?? ''} onChange={(event) => setNewAddress({ ...newAddress, postalCode: event.target.value })} />
                      <div className="sm:col-span-2">
                        <Input label="ქუჩა და ნომერი" value={newAddress.street} onChange={(event) => setNewAddress({ ...newAddress, street: event.target.value })} error={errors['address.street']} placeholder="მაგ. აბაშიძის ქ. 24" />
                      </div>
                      <div className="sm:col-span-2">
                        <Input label="ბინა / ოფისი (არასავალდებულო)" value={newAddress.apartment ?? ''} onChange={(event) => setNewAddress({ ...newAddress, apartment: event.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <Checkbox label="ეს მისამართი შეინახე პროფილში შემდეგი შეკვეთისთვის" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="mb-3 text-[9px] uppercase tracking-[0.16em] text-ink/65">მიწოდების მეთოდი</h3>
                    <div className="space-y-2">
                      {(['standard', 'express'] as DeliveryMethod[]).map((method) => (
                        <label key={method} className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${delivery === method ? 'border-ink bg-warmwhite/60' : 'border-ink/10 hover:border-ink/30'}`}>
                          <input type="radio" name="delivery" checked={delivery === method} onChange={() => setDelivery(method)} className="mt-1 h-3.5 w-3.5 accent-ink" />
                          <span className="flex-1">
                            <span className="flex items-center justify-between gap-3 text-[11px] font-medium">
                              {DELIVERY_METHOD_LABELS[method]}
                              <span className="tabular-nums">{method === 'express' ? formatMoney(snapshot.settings.expressShippingFee) : totals.subtotal - totals.discount >= snapshot.settings.freeShippingThreshold ? 'უფასო' : formatMoney(snapshot.settings.standardShippingFee)}</span>
                            </span>
                            <span className="mt-1 block text-[10px] text-ink/65">{DELIVERY_METHOD_HINTS[method]}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {step === 3 && (
                <section className="space-y-7">
                  <h2 className="font-display text-2xl font-light">გადახდა</h2>
                  <div className="border border-ink/25 bg-warmwhite/50 p-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-ivory">
                        <CreditCard className="h-4 w-4" aria-hidden />
                      </span>
                      <div>
                        <p className="text-[12px] font-medium">გადახდა მიღებისას (COD)</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-ink/65">{snapshot.settings.codInstructions}</p>
                      </div>
                    </div>
                  </div>
                  <InlineNotice tone="neutral" icon={<ShieldCheck className="h-4 w-4" aria-hidden />}>
                    ონლაინ ბარათის გადახდა ამ ეტაპზე არ არის ინტეგრირებული. თანხას იხდით კურიერთან ნივთის მიღებისას.
                  </InlineNotice>
                  <div>
                    <p className="mb-3 text-[9px] uppercase tracking-[0.16em] text-ink/65">პრომოკოდი</p>
                    {promo ? (
                      <div className="flex items-center justify-between border border-[#3f6b53]/25 bg-[#3f6b53]/[0.06] px-4 py-3">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#315742]">{promo.code}</p>
                          <p className="mt-0.5 text-[10px] text-[#315742]/70">−{formatMoney(promo.discount)}</p>
                        </div>
                        <button type="button" onClick={() => { setPromo(null); setPromoError(''); }} className="text-[10px] uppercase tracking-[0.12em] text-[#315742] underline underline-offset-2">მოშორება</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input value={promoInput} onChange={(event) => setPromoInput(event.target.value.toUpperCase())} placeholder="შეიყვანეთ კოდი" className="flex-1" aria-label="პრომოკოდი" />
                        <Button variant="outline" onClick={() => void applyPromo()} loading={promoLoading}>გამოყენება</Button>
                      </div>
                    )}
                    {promoError && <p className="mt-2 text-[10px] text-[#8f3f3f]">{promoError}</p>}
                  </div>
                  <Textarea
                    label="შენიშვნა კურიერისთვის (არასავალდებულო)"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="მაგ. დარეკეთ მიტანამდე"
                  />
                </section>
              )}

              {step === 4 && (
                <section className="space-y-6">
                  <h2 className="font-display text-2xl font-light">შეკვეთის დადასტურება</h2>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="border border-ink/10 p-4">
                      <p className="text-[8px] uppercase tracking-[0.16em] text-ink/65">კონტაქტი</p>
                      <p className="mt-2 text-[11px] leading-relaxed">{contact.firstName} {contact.lastName}<br />{contact.email}<br />{contact.phone}</p>
                      <button type="button" onClick={() => setStep(1)} className="mt-3 text-[9px] uppercase tracking-[0.12em] text-ink/65 underline underline-offset-2 hover:text-ink">შეცვლა</button>
                    </div>
                    <div className="border border-ink/10 p-4">
                      <p className="text-[8px] uppercase tracking-[0.16em] text-ink/65">მიწოდება</p>
                      <p className="mt-2 text-[11px] leading-relaxed">
                        {selectedAddress.city}, {selectedAddress.street}{selectedAddress.apartment ? `, ${selectedAddress.apartment}` : ''}<br />
                        {DELIVERY_METHOD_LABELS[delivery]}
                      </p>
                      <button type="button" onClick={() => setStep(2)} className="mt-3 text-[9px] uppercase tracking-[0.12em] text-ink/65 underline underline-offset-2 hover:text-ink">შეცვლა</button>
                    </div>
                  </div>
                  <div className="border border-ink/10">
                    <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
                      <p className="text-[8px] uppercase tracking-[0.16em] text-ink/65">პროდუქტები</p>
                      <p className="text-[8px] uppercase tracking-[0.16em] text-ink/65">{count} ნივთი</p>
                    </div>
                    <ul className="divide-y divide-ink/10">
                      {availableLines.map((line) => (
                        <li key={`${line.product.id}:${line.variant.id}`} className="flex items-center gap-4 px-4 py-3">
                          <SafeImage source={line.product.images[0]?.source ?? ''} alt={line.product.name} wrapperClassName="h-16 w-12 shrink-0" width={480} />
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-base">{line.product.name} <span className="text-[10px] text-ink/65">×{line.line.quantity}</span></p>
                            <p className="mt-0.5 text-[9px] text-ink/65">{getVariantLabel(line.product, line.variant)}</p>
                          </div>
                          <span className="text-[11px] tabular-nums">{formatMoney(line.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-start gap-3 border border-ink/10 p-4">
                    <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-earth" aria-hidden />
                    <p className="text-[10px] leading-relaxed text-ink/65">
                      გადახდა: <strong className="font-medium text-ink/70">მიღებისას</strong> · {snapshot.settings.codInstructions}
                    </p>
                  </div>
                  <Checkbox
                    label="ვეთანხმები შეკვეთის პირობებს, მიწოდების წესებსა და კონფიდენციალურობის პოლიტიკას."
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                  />
                </section>
              )}

              {formError && <div className="mt-5"><FormError>{formError}</FormError></div>}

              <div className="mt-8 flex items-center justify-between gap-3 border-t border-ink/10 pt-6">
                {step > 1 ? (
                  <Button variant="ghost" onClick={goBack} leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}>უკან</Button>
                ) : (
                  <Link to="/cart" className="text-[10px] uppercase tracking-[0.14em] text-ink/65 hover:text-ink">კალათის ნახვა</Link>
                )}
                {step < 4 ? (
                  <Button onClick={goNext} rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}>გაგრძელება</Button>
                ) : (
                  <Button onClick={() => void placeOrder()} loading={placing} size="lg" rightIcon={<CheckCircle2 className="h-4 w-4" aria-hidden />}>
                    შეკვეთის გაფორმება
                  </Button>
                )}
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="border border-ink/10 bg-soft p-5">
              <h2 className="font-display text-2xl font-light">თქვენი შეკვეთა</h2>
              <ul className="mt-4 max-h-[300px] divide-y divide-ink/10 overflow-y-auto">
                {lines.map((line) => (
                  <li key={`${line.product.id}:${line.variant.id}`} className="flex gap-3 py-3">
                    <SafeImage source={line.product.images[0]?.source ?? ''} alt={line.product.name} wrapperClassName="h-16 w-12 shrink-0" width={480} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium">{line.product.name}</p>
                      <p className="mt-0.5 text-[9px] text-ink/65">{line.variantLabel} · ×{line.line.quantity}</p>
                      {!line.available && <p className="mt-1 text-[9px] text-[#8f3f3f]">მიუწვდომელია</p>}
                    </div>
                    <span className="text-[10px] tabular-nums">{formatMoney(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-2 border-t border-ink/10 pt-3 text-[11px]">
                <div className="flex justify-between text-ink/65"><span>ქვეჯამი</span><span className="tabular-nums">{formatMoney(totals.subtotal)}</span></div>
                {totals.discount > 0 && <div className="flex justify-between text-[#3f6b53]"><span>ფასდაკლება</span><span className="tabular-nums">−{formatMoney(totals.discount)}</span></div>}
                <div className="flex justify-between text-ink/65"><span>მიწოდება</span><span className="tabular-nums">{totals.shipping === 0 ? 'უფასო' : formatMoney(totals.shipping)}</span></div>
                <div className="flex items-baseline justify-between border-t border-ink/10 pt-3"><span className="text-[9px] uppercase tracking-[0.14em]">ჯამი</span><span className="font-display text-2xl tabular-nums">{formatMoney(totals.total)}</span></div>
              </div>
            </div>
            <div className="mt-4 space-y-2.5 text-[9px] uppercase tracking-[0.12em] text-ink/65">
              <p className="flex items-center gap-2"><Truck className="h-3.5 w-3.5" aria-hidden /> 2–4 სამუშაო დღე</p>
              <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" aria-hidden /> თბილისი და რეგიონები</p>
              <p className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> 14 დღის დაბრუნება</p>
            </div>
          </aside>
        </div>
      </div>
      <CartDrawer />
    </>
  );
}

export function CheckoutSuccessPage() {
  const { id } = useParams();
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const order = snapshot.orders.find((entry) => entry.id === id && entry.userId === snapshot.session?.id);

  if (!order) {
    return (
      <div className="container-editorial py-24">
        <EmptyState
          icon={<PackageCheck className="h-5 w-5" aria-hidden />}
          title="შეკვეთა ვერ მოიძებნა"
          description="თუ შეკვეთა ახლახან გაფორმდა, გახსენით პროფილის შეკვეთების გვერდი."
          action={<Link to="/account/orders" className="text-[10px] uppercase tracking-[0.14em] underline underline-offset-4">შეკვეთებში გადასვლა</Link>}
        />
      </div>
    );
  }

  return (
    <>
      <Seo title={`შეკვეთა ${order.number} მიღებულია`} noIndex />
      <div className="container-editorial max-w-3xl py-16 md:py-24">
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#3f6b53] text-white">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </span>
          <p className="eyebrow mt-6">შეკვეთა მიღებულია</p>
          <h1 className="mt-3 font-display text-5xl font-light tracking-display">მადლობა, {order.customer.firstName}</h1>
          <p className="mt-4 text-[12px] leading-relaxed text-ink/65">
            შეკვეთა <strong className="text-ink">{order.number}</strong> წარმატებით გაფორმდა. ჩვენ დაგიკავშირდებით დადასტურებისთვის.
          </p>
        </div>

        <div className="mt-10 border border-ink/10">
          <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
            <span className="text-[9px] uppercase tracking-[0.16em] text-ink/65">{formatDateTime(order.createdAt)}</span>
            <span className="text-[9px] uppercase tracking-[0.14em] text-[#8a652e]">{ORDER_STATUS_LABELS[order.status]}</span>
          </div>
          <ul className="divide-y divide-ink/10">
            {order.items.map((item) => (
              <li key={`${item.productId}:${item.variantId}`} className="flex items-center gap-4 px-5 py-4">
                <SafeImage source={item.image} alt={item.productName} wrapperClassName="h-20 w-14 shrink-0" width={480} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg">{item.productName}</p>
                  <p className="mt-0.5 text-[10px] text-ink/65">{item.variantLabel} · ×{item.quantity}</p>
                </div>
                <span className="text-[11px] tabular-nums">{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-ink/10 px-5 py-4 text-[11px]">
            <div className="flex justify-between text-ink/65"><span>ქვეჯამი</span><span className="tabular-nums">{formatMoney(order.subtotal)}</span></div>
            {order.discountTotal > 0 && <div className="flex justify-between text-[#3f6b53]"><span>ფასდაკლება {order.promoCode && `· ${order.promoCode}`}</span><span className="tabular-nums">−{formatMoney(order.discountTotal)}</span></div>}
            <div className="flex justify-between text-ink/65"><span>მიწოდება</span><span className="tabular-nums">{order.shippingFee === 0 ? 'უფასო' : formatMoney(order.shippingFee)}</span></div>
            <div className="flex items-baseline justify-between border-t border-ink/10 pt-3"><span className="text-[9px] uppercase tracking-[0.14em]">ჯამი</span><span className="font-display text-2xl tabular-nums">{formatMoney(order.total)}</span></div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="border border-ink/10 p-4">
            <p className="text-[8px] uppercase tracking-[0.16em] text-ink/65">მიწოდება</p>
            <p className="mt-2 text-[11px] leading-relaxed">{order.address.city}, {order.address.street}{order.address.apartment ? `, ${order.address.apartment}` : ''}<br />{DELIVERY_METHOD_LABELS[order.deliveryMethod]}</p>
          </div>
          <div className="border border-ink/10 p-4">
            <p className="text-[8px] uppercase tracking-[0.16em] text-ink/65">გადახდა</p>
            <p className="mt-2 text-[11px] leading-relaxed">მიღებისას · {formatMoney(order.total)}<br />{snapshot.settings.codInstructions}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-ink/10 pt-6 sm:flex-row">
          <Link to="/catalog" className="text-[10px] uppercase tracking-[0.14em] text-ink/65 underline underline-offset-4 hover:text-ink">შოპინგის გაგრძელება</Link>
          <Button onClick={() => navigate(`/account/orders/${order.id}`)}>
            შეკვეთის დეტალები
          </Button>
        </div>
      </div>
    </>
  );
}
