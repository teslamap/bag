import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus, Tag, X } from 'lucide-react';
import { Drawer } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { SafeImage } from '@/components/ui/SafeImage';
import { useBackendSnapshot } from '@/state/backend';
import { useCartStore } from '@/state/cart';
import { useCartDetails } from '@/hooks/useCommerce';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { errorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/utils';

export function CartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const close = useCartStore((state) => state.close);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const promo = useCartStore((state) => state.promo);
  const setPromo = useCartStore((state) => state.setPromo);
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const { lines, orphanLines, subtotal, count, freeShippingRemaining } = useCartDetails();
  const [code, setCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [checking, setChecking] = useState(false);

  const discount = promo?.discount ?? 0;
  const discounted = Math.max(0, subtotal - discount);
  const shipping = discounted >= snapshot.settings.freeShippingThreshold ? 0 : snapshot.settings.standardShippingFee;
  const total = discounted + shipping;
  const availableLines = lines.filter((line) => line.available);
  const unavailable = lines.length !== availableLines.length;

  const applyPromo = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setPromoError('შეიყვანეთ პრომოკოდი.');
      return;
    }
    if (!snapshot.session) {
      setPromoError('პრომოკოდის გამოსაყენებლად გაიარეთ ავტორიზაცია.');
      return;
    }
    setChecking(true);
    setPromoError('');
    try {
      const result = await backend.validatePromo(normalized, subtotal);
      if (!result.valid) {
        setPromo(null);
        setPromoError(result.reason ?? 'პრომოკოდი არასწორია.');
        return;
      }
      setPromo({ code: normalized, discount: result.discount });
      setCode('');
      toast('პრომოკოდი გააქტიურდა', { message: `დაზოგავთ ${formatMoney(result.discount)}-ს.` });
    } catch (error) {
      setPromoError(errorMessage(error));
    } finally {
      setChecking(false);
    }
  };

  const goCheckout = () => {
    close();
    if (!snapshot.session) {
      navigate(`/auth?mode=login&next=${encodeURIComponent('/checkout')}`);
      return;
    }
    navigate('/checkout');
  };

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title="კალათა"
      eyebrow={count ? `${count} ნივთი` : 'ცარიელია'}
      footer={
        <div className="space-y-4">
          <div className="space-y-2 text-[12px]">
            <div className="flex justify-between text-ink/65">
              <span>ქვეჯამი</span>
              <span className="tabular-nums">{formatMoney(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[#3f6b53]">
                <span>ფასდაკლება {promo?.code && `· ${promo.code}`}</span>
                <span className="tabular-nums">−{formatMoney(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink/65">
              <span>მიწოდება</span>
              <span className="tabular-nums">{shipping === 0 ? 'უფასო' : formatMoney(shipping)}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-ink/10 pt-3 text-ink">
              <span className="text-[10px] uppercase tracking-[0.16em]">ჯამი</span>
              <span className="font-display text-2xl tabular-nums">{formatMoney(total)}</span>
            </div>
          </div>
          <Button className="w-full" size="lg" disabled={!availableLines.length || unavailable} onClick={goCheckout} rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}>
            გადახდაზე გადასვლა
          </Button>
          <p className="text-center text-[9px] uppercase tracking-[0.14em] text-ink/65">
            უსაფრთხო შეკვეთა · გადახდა მიღებისას
          </p>
        </div>
      }
    >
      {lines.length === 0 && orphanLines.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-8 py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-ink/10">
            <Tag className="h-6 w-6 text-ink/25" strokeWidth={1.25} aria-hidden />
          </span>
          <h3 className="mt-6 font-display text-3xl font-light tracking-display">კალათა ცარიელია</h3>
          <p className="mt-3 max-w-xs text-[12px] leading-relaxed text-ink/65">
            დაიწყეთ კოლექციის დათვალიერებით — თითოეული ობიექტი ატელიეში მზადდება.
          </p>
          <Link
            to="/catalog"
            onClick={close}
            className="mt-8 inline-flex items-center gap-2 border-b border-ink/30 pb-1 text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-ink"
          >
            კოლექციის ნახვა
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="px-5 py-5 sm:px-7">
          <div className="mb-5 border border-ink/10 px-4 py-3">
            {freeShippingRemaining > 0 ? (
              <>
                <p className="text-[10px] leading-relaxed text-ink/65">
                  უფასო მიწოდებამდე დარჩენილია{' '}
                  <span className="font-medium text-ink">{formatMoney(freeShippingRemaining)}</span>
                </p>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="h-full rounded-full bg-champagne transition-all duration-700"
                    style={{ width: `${Math.min(100, (discounted / snapshot.settings.freeShippingThreshold) * 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#3f6b53]">უფასო სტანდარტული მიწოდება</p>
            )}
          </div>

          <ul className="divide-y divide-ink/10">
            {lines.map((entry) => (
              <li key={`${entry.line.productId}:${entry.line.variantId}`} className="flex gap-4 py-5">
                <Link to={`/product/${entry.product.slug}`} onClick={close} className="shrink-0">
                  <SafeImage
                    source={entry.product.images[0]?.source ?? ''}
                    alt={entry.product.name}
                    wrapperClassName="h-28 w-20 bg-stone"
                    width={480}
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        to={`/product/${entry.product.slug}`}
                        onClick={close}
                        className="font-display text-lg leading-tight transition-colors hover:text-earth"
                      >
                        {entry.product.name}
                      </Link>
                      <p className="mt-1 text-[10px] text-ink/65">{entry.variantLabel}</p>
                      {!entry.available && (
                        <p className="mt-2 text-[10px] text-[#8f3f3f]">მიუწვდომელია — ამოიღეთ კალათიდან</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(entry.line.productId, entry.line.variantId)}
                      aria-label="კალათიდან ამოღება"
                      className="text-ink/65 transition-colors hover:text-ink"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    <div className="inline-flex h-8 items-center border border-ink/15">
                      <button
                        type="button"
                        onClick={() => setQuantity(entry.line.productId, entry.line.variantId, entry.line.quantity - 1)}
                        className="flex h-full w-7 items-center justify-center text-ink/65 hover:text-ink"
                        aria-label="რაოდენობის შემცირება"
                      >
                        <Minus className="h-3 w-3" aria-hidden />
                      </button>
                      <span className="w-7 text-center text-[11px] tabular-nums">{entry.line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(entry.line.productId, entry.line.variantId, entry.line.quantity + 1)}
                        disabled={entry.line.quantity >= entry.maxQuantity}
                        className="flex h-full w-7 items-center justify-center text-ink/65 hover:text-ink disabled:opacity-30"
                        aria-label="რაოდენობის გაზრდა"
                      >
                        <Plus className="h-3 w-3" aria-hidden />
                      </button>
                    </div>
                    <p className="text-[12px] font-medium tabular-nums">{formatMoney(entry.lineTotal)}</p>
                  </div>
                </div>
              </li>
            ))}
            {orphanLines.map((line) => (
              <li key={`${line.productId}:${line.variantId}`} className="flex items-center justify-between py-4 text-[11px] text-ink/65">
                <span>პროდუქტი აღარ არის ხელმისაწვდომი</span>
                <button
                  type="button"
                  onClick={() => remove(line.productId, line.variantId)}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  ამოღება
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-7 border-t border-ink/10 pt-5">
            <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-ink/65">
              <Tag className="h-3.5 w-3.5" aria-hidden />
              პრომოკოდი
            </p>
            {promo ? (
              <div className="flex items-center justify-between border border-[#3f6b53]/25 bg-[#3f6b53]/[0.06] px-4 py-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#315742]">{promo.code}</p>
                  <p className="mt-0.5 text-[10px] text-[#315742]/70">−{formatMoney(promo.discount)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPromo(null);
                    setPromoError('');
                  }}
                  className="text-[10px] uppercase tracking-[0.12em] text-[#315742] underline underline-offset-2"
                >
                  მოშორება
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="შეიყვანეთ კოდი"
                  className="h-10 min-w-0 flex-1 border border-ink/15 bg-transparent px-3 text-[11px] uppercase tracking-[0.08em] placeholder:normal-case placeholder:text-ink/65 focus:border-ink focus:outline-none"
                  aria-label="პრომოკოდი"
                  onKeyDown={(event) => { if (event.key === 'Enter') void applyPromo(); }}
                />
                <Button variant="outline" size="sm" onClick={() => void applyPromo()} loading={checking}>
                  გამოყენება
                </Button>
              </div>
            )}
            {promoError && <p className="mt-2 text-[10px] leading-relaxed text-[#8f3f3f]">{promoError}</p>}
            {!snapshot.session && (
              <p className="mt-2 text-[10px] text-ink/65">კოდის გამოსაყენებლად საჭიროა ავტორიზაცია.</p>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
