import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShoppingBag, Tag, Trash2, Truck } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { useCartStore } from '@/state/cart';
import { useCartDetails } from '@/hooks/useCommerce';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { errorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/utils';
import { Seo } from '@/components/system/Seo';
import { SafeImage } from '@/components/ui/SafeImage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState, InlineNotice } from '@/components/ui/Feedback';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { CartDrawer } from '@/components/store/CartDrawer';

export function CartPage() {
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const { lines, subtotal, count, totals, freeShippingRemaining } = useCartDetails();
  const items = useCartStore((state) => state.items);
  const promo = useCartStore((state) => state.promo);
  const setPromo = useCartStore((state) => state.setPromo);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const [code, setCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [loading, setLoading] = useState(false);

  const applyPromo = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setPromoError('შეიყვანეთ პრომოკოდი.');
      return;
    }
    setLoading(true);
    setPromoError('');
    try {
      const result = await backend.validatePromo(normalized, subtotal);
      if (!result.valid) {
        setPromoError(result.reason ?? 'პრომოკოდი არასწორია.');
        setPromo(null);
        return;
      }
      setPromo({ code: normalized, discount: result.discount });
      setCode('');
      toast('პრომოკოდი გააქტიურდა', { message: `დაზოგავთ ${formatMoney(result.discount)}-ს.` });
    } catch (error) {
      setPromoError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (!lines.length && !items.length) {
    return (
      <div className="container-editorial py-20 md:py-28">
        <Seo title="კალათა" noIndex />
        <EmptyState
          icon={<ShoppingBag className="h-5 w-5" aria-hidden />}
          eyebrow="თქვენი არჩევანი"
          title="კალათა ცარიელია"
          description="დაამატეთ პროდუქტი კოლექციიდან და დაბრუნდით აქ შეკვეთის გასაფორმებლად."
          action={
            <Link
              to="/catalog"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-[10px] uppercase tracking-[0.16em] text-ivory transition-colors hover:bg-inkhover"
            >
              კოლექციის ნახვა <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <>
      <Seo title="კალათა" noIndex description="MAKU — კალათისა და შეკვეთის დეტალები." />
      <div className="container-editorial py-10 md:py-14">
        <div className="flex flex-col justify-between gap-5 border-b border-ink/10 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">თქვენი არჩევანი</p>
            <h1 className="mt-3 font-display text-4xl font-light tracking-display md:text-5xl">კალათა</h1>
            <p className="mt-2 text-[11px] text-ink/65">{count} ნივთი · {lines.length} პოზიცია</p>
          </div>
          <Link to="/catalog" className="link-underline text-[10px] uppercase tracking-[0.16em] text-ink/65 hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> შოპინგის გაგრძელება
          </Link>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:gap-16">
          <div>
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {lines.map((line) => (
                <li key={`${line.product.id}:${line.variant.id}`} className="flex gap-4 py-5 sm:gap-6">
                  <Link to={`/product/${line.product.slug}`} className="block w-24 shrink-0 sm:w-28">
                    <SafeImage
                      source={line.product.images[0]?.source ?? ''}
                      alt={line.product.name}
                      wrapperClassName="aspect-[3/4] bg-stone/60"
                      width={480}
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/product/${line.product.slug}`} className="font-display text-xl leading-tight transition-opacity hover:opacity-60">
                          {line.product.name}
                        </Link>
                        <p className="mt-1 text-[10px] text-ink/65">{line.variantLabel}</p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-ink/65">{line.variant.sku}</p>
                        {!line.available && (
                          <p className="mt-2 text-[10px] text-[#8f3f3f]">
                            {line.product.status !== 'active' ? 'პროდუქტი აღარ იყიდება' : 'მარაგი ამოწურულია'}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.product.id, line.variant.id)}
                        aria-label={`${line.product.name}-ის კალათიდან ამოღება`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink/65 transition-colors hover:bg-ink/[0.04] hover:text-[#8f3f3f]"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <div className="flex items-end justify-between gap-4">
                      {line.available ? (
                        <QuantityStepper
                          value={line.line.quantity}
                          min={1}
                          max={line.maxQuantity}
                          onChange={(value) => setQuantity(line.product.id, line.variant.id, value)}
                          size="sm"
                        />
                      ) : (
                        <span className="text-[10px] uppercase tracking-[0.12em] text-ink/65">მიუწვდომელია</span>
                      )}
                      <div className="text-right">
                        <p className="text-[13px] font-medium tabular-nums">{formatMoney(line.lineTotal)}</p>
                        {line.line.quantity > 1 && (
                          <p className="mt-0.5 text-[9px] text-ink/65">{formatMoney(line.unitPrice)} / ერთეული</p>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {totals.promo.reason && totals.promo.reason.includes('პრომოკოდი') && (
              <div className="mt-4">
                <InlineNotice tone="warning">{totals.promo.reason}</InlineNotice>
              </div>
            )}

            <div className="mt-6 border border-ink/10 bg-soft p-5">
              <p className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-ink/65">
                <Tag className="h-3.5 w-3.5" aria-hidden /> პრომოკოდი
              </p>
              {promo ? (
                <div className="mt-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#315742]">{promo.code}</p>
                    <p className="mt-0.5 text-[10px] text-[#315742]/70">ფასდაკლება −{formatMoney(promo.discount)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPromo(null)}
                    className="text-[9px] uppercase tracking-[0.12em] text-[#315742] underline underline-offset-4"
                  >
                    მოშორება
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    placeholder="WELCOME10"
                    aria-label="პრომოკოდი"
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={() => void applyPromo()} loading={loading}>
                    გამოყენება
                  </Button>
                </div>
              )}
              {promoError && <p className="mt-2 text-[10px] text-[#8f3f3f]">{promoError}</p>}
              {snapshot.backendMode === 'demo' && !promo && (
                <p className="mt-3 text-[9px] text-ink/65">დემო კოდები: WELCOME10 · ATELIER20 (₾250-დან) · DELIVERY15 (₾150-დან)</p>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="border border-ink/10 bg-warmwhite/45 p-5">
              <h2 className="font-display text-2xl font-light">შეკვეთის ჯამი</h2>
              <div className="mt-5 space-y-3 text-[11px]">
                <div className="flex justify-between text-ink/65">
                  <span>ქვეჯამი</span>
                  <span className="tabular-nums text-ink">{formatMoney(totals.subtotal)}</span>
                </div>
                {totals.discountTotal > 0 && (
                  <div className="flex justify-between text-[#3f6b53]">
                    <span>ფასდაკლება</span>
                    <span className="tabular-nums">−{formatMoney(totals.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-ink/65">
                  <span>სტანდარტული მიწოდება</span>
                  <span className="tabular-nums text-ink">{totals.shippingFee === 0 ? 'უფასო' : formatMoney(totals.shippingFee)}</span>
                </div>
                <div className="flex items-baseline justify-between border-t border-ink/10 pt-4">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-ink/65">ჯამი</span>
                  <span className="font-display text-3xl tabular-nums">{formatMoney(totals.total)}</span>
                </div>
              </div>

              {freeShippingRemaining > 0 && (
                <div className="mt-5 border-t border-ink/10 pt-4">
                  <p className="flex items-center gap-2 text-[10px] text-ink/65">
                    <Truck className="h-3.5 w-3.5 text-earth" aria-hidden />
                    კიდევ {formatMoney(freeShippingRemaining)} და მიწოდება უფასოა.
                  </p>
                  <div className="mt-2 h-px w-full bg-ink/10">
                    <div
                      className="h-px bg-champagne transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((totals.subtotal - totals.discountTotal) / snapshot.settings.freeShippingThreshold * 100))}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                className="mt-6 w-full"
                size="lg"
                onClick={() => {
                  if (!snapshot.session) {
                    navigate('/auth?mode=login&next=%2Fcheckout');
                    return;
                  }
                  navigate('/checkout');
                }}
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
                disabled={!lines.some((line) => line.available)}
              >
                {snapshot.session ? 'გადახდაზე გადასვლა' : 'შესვლა და გაფორმება'}
              </Button>
              <p className="mt-3 text-center text-[9px] leading-relaxed text-ink/65">
                გადახდა მიღებისას · უსაფრთხო შეკვეთა · 14 დღის დაბრუნება
              </p>
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.14em] text-ink/65">
              <Truck className="h-3.5 w-3.5" aria-hidden /> თბილისი და რეგიონები · 2–4 დღე
            </div>
          </aside>
        </div>
      </div>
      <CartDrawer />
    </>
  );
}
