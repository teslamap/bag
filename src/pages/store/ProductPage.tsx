import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Heart,
  Minus,
  Plus,
  Ruler,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { useCartStore } from '@/state/cart';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { Seo } from '@/components/system/Seo';
import { Reveal } from '@/components/system/Motion';
import { SafeImage } from '@/components/ui/SafeImage';
import { ProductCard } from '@/components/store/ProductCard';
import { Button } from '@/components/ui/Button';
import { Badge, ErrorState, Modal } from '@/components/ui/Feedback';
import { Rating, RatingInput } from '@/components/ui/Rating';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Input, Textarea, FormError } from '@/components/ui/Input';
import { errorMessage } from '@/lib/errors';
import { discountPercent, formatDate, formatMoney, getProductStock, getVariantLabel, imageSrc } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/constants';

export function ProductPage() {
  const { slug } = useParams();
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const add = useCartStore((state) => state.add);
  const product = snapshot.products.find((entry) => entry.slug === slug);
  const category = snapshot.categories.find((entry) => entry.id === product?.categoryId);
  const subcategory = snapshot.categories.find((entry) => entry.id === product?.subcategoryId);
  const session = snapshot.session;
  const currentUser = snapshot.users.find((entry) => entry.id === session?.id);
  const favorite = Boolean(currentUser?.favoriteProductIds.includes(product?.id ?? ''));

  const [imageIndex, setImageIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const zoomRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState('50% 50%');

  useEffect(() => {
    setImageIndex(0);
    setQuantity(1);
    setReviewOpen(false);
    setReviewError('');
    if (product) {
      const firstAvailable = product.variants.find((variant) => variant.stock > 0) ?? product.variants[0];
      setSelections(firstAvailable ? { ...firstAvailable.options } : {});
    }
  }, [product?.id]);

  const selectedVariant = useMemo(() => {
    if (!product) return undefined;
    return (
      product.variants.find((variant) =>
        product.options.every((option) => variant.options[option.name] === selections[option.name]),
      ) ?? product.variants.find((variant) => variant.stock > 0) ?? product.variants[0]
    );
  }, [product, selections]);

  const selectedPrice = product ? product.price + (selectedVariant?.priceDelta ?? 0) : 0;
  const sale = product ? discountPercent(selectedPrice, product.compareAtPrice) : null;
  const totalStock = product ? getProductStock(product) : 0;
  const selectedStock = selectedVariant?.stock ?? 0;

  const userReview = product
    ? snapshot.reviews.find((review) => review.productId === product.id && review.userId === session?.id)
    : undefined;
  const purchased = product
    ? snapshot.orders.some(
        (order) =>
          order.userId === session?.id &&
          order.status !== 'cancelled' &&
          order.items.some((item) => item.productId === product.id),
      )
    : false;
  const canReview = Boolean(session && purchased && (!userReview || userReview.status === 'rejected'));
  const reviews = product
    ? snapshot.reviews.filter(
        (review) =>
          review.productId === product.id &&
          (review.status === 'approved' || (session && review.userId === session.id)),
      )
    : [];

  const related = product
    ? snapshot.products
        .filter((entry) => entry.status === 'active' && entry.id !== product.id && (entry.categoryId === product.categoryId || entry.bestseller))
        .slice(0, 4)
    : [];

  const jsonLd = useMemo(
    () =>
      product
        ? {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.description,
            sku: product.sku,
            brand: { '@type': 'Brand', name: 'MAKU' },
            image: product.images.map((image) => `${window.location.origin}${imageSrc(image.source, 960)}`),
            offers: {
              '@type': 'Offer',
              priceCurrency: 'GEL',
              price: (selectedPrice / 100).toFixed(2),
              availability: selectedStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              url: window.location.href,
            },
            aggregateRating:
              product.reviewCount > 0
                ? { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount }
                : undefined,
          }
        : undefined,
    [product, selectedPrice, selectedStock],
  );

  if (!product) {
    return (
      <div className="container-editorial py-24">
        <ErrorState
          title="პროდუქტი ვერ მოიძებნა"
          description="შესაძლოა ბმული არასწორია ან პროდუქტი კოლექციიდან ამოღებულია."
          onRetry={() => navigate('/catalog')}
        />
      </div>
    );
  }

  const changeOption = (optionName: string, value: string) => {
    const candidate = { ...selections, [optionName]: value };
    const variant = product.variants.find((entry) =>
      product.options.every((option) => entry.options[option.name] === candidate[option.name]),
    );
    if (variant) {
      setSelections(candidate);
      setQuantity((current) => Math.min(current, Math.max(1, variant.stock)));
      return;
    }
    const fallback = product.variants.find(
      (entry) => entry.options[optionName] === value && entry.stock > 0,
    );
    if (fallback) {
      setSelections({ ...fallback.options });
      setQuantity(1);
    }
  };

  const valueAvailable = (optionName: string, value: string) => {
    return product.variants.some((variant) => {
      if (variant.options[optionName] !== value) return false;
      return product.options.every(
        (option) => option.name === optionName || variant.options[option.name] === selections[option.name],
      );
    });
  };

  const addToCart = () => {
    if (!selectedVariant || selectedVariant.stock < 1) {
      toast('არჩეული ვარიანტი ამოწურულია', { variant: 'warning' });
      return;
    }
    setAdding(true);
    add(product.id, selectedVariant.id, Math.min(quantity, selectedVariant.stock));
    toast(`${product.name} დაემატა კალათას`, {
      message: selectedVariant ? getVariantLabel(product, selectedVariant) : undefined,
    });
    window.setTimeout(() => setAdding(false), 350);
  };

  const buyNow = () => {
    addToCart();
    navigate('/checkout');
  };

  const toggleFavorite = async () => {
    if (!session) {
      navigate(`/auth?mode=login&next=${encodeURIComponent(`/product/${product.slug}`)}`);
      return;
    }
    try {
      const added = await backend.toggleFavorite(product.id);
      toast(added ? 'დაემატა რჩეულებს' : 'ამოღებულია რჩეულებიდან', { variant: 'info' });
    } catch (error) {
      toast('ვერ შეინახა', { message: errorMessage(error), variant: 'error' });
    }
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    setReviewError('');
    setReviewSaving(true);
    try {
      await backend.createReview({
        productId: product.id,
        rating: reviewRating,
        title: reviewTitle,
        body: reviewBody,
      });
      toast('მიმოხილვა გაიგზავნა', { message: 'გამოქვეყნდება მოდერაციის შემდეგ.' });
      setReviewOpen(false);
      setReviewTitle('');
      setReviewBody('');
      setReviewRating(5);
    } catch (error) {
      setReviewError(errorMessage(error));
    } finally {
      setReviewSaving(false);
    }
  };

  const accordionItems = [
    { title: 'მასალა და ზომები', content: `${product.materials}\n${product.dimensions}`, icon: Ruler },
    { title: 'მოვლა', content: product.care, icon: ShieldCheck },
    { title: 'მიწოდება და დაბრუნება', content: 'სტანდარტული მიწოდება 2–4 სამუშაო დღეში. უფასო ₾300-დან. მიღებისას გადახდა. უკან დაბრუნება შესაძლებელია 14 დღის განმავლობაში, თუ ნივთი გამოუყენებელია.', icon: Truck },
  ];

  return (
    <>
      <Seo
        title={`${product.name} — ${product.subtitle}`}
        description={product.description.slice(0, 158)}
        image={imageSrc(product.images[0]?.source ?? '', 960)}
        type="product"
        jsonLd={jsonLd}
      />
      <div className="container-editorial pt-6">
        <nav className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-ink/65" aria-label="პურის ნამცხვარი">
          <Link to="/" className="hover:text-ink">მთავარი</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-ink">მაღაზია</Link>
          {category && (
            <>
              <span>/</span>
              <Link to={`/catalog?category=${category.id}`} className="hover:text-ink">{category.name}</Link>
            </>
          )}
          {subcategory && (
            <>
              <span>/</span>
              <Link to={`/catalog?category=${category?.id ?? ''}&sub=${subcategory.id}`} className="hover:text-ink">{subcategory.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-ink/60">{product.name}</span>
        </nav>
      </div>

      <section className="container-editorial mt-6 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        <div>
          <div
            ref={zoomRef}
            className="group relative cursor-zoom-in overflow-hidden bg-stone"
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setOrigin(`${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`);
            }}
            onClick={() => setZoomOpen(true)}
          >
            <SafeImage
              source={product.images[imageIndex]?.source ?? ''}
              alt={product.images[imageIndex]?.alt || product.name}
              wrapperClassName="aspect-[4/5] md:aspect-[5/6]"
              className="transition-transform duration-700 ease-out group-hover:scale-[1.35]"
              style={{ transformOrigin: origin }}
              sizes="(max-width: 1024px) 100vw, 58vw"
              priority
            />
            <span className="absolute bottom-4 right-4 rounded-full bg-ivory/85 px-3 py-1.5 text-[8px] uppercase tracking-[0.16em] text-ink/65 backdrop-blur">
              გადიდება
            </span>
            {sale && <span className="absolute left-4 top-4"><Badge tone="danger">-{sale}%</Badge></span>}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  className={`relative overflow-hidden border transition-colors ${index === imageIndex ? 'border-ink' : 'border-transparent hover:border-ink/30'}`}
                  aria-label={`სურათი ${index + 1}`}
                  aria-current={index === imageIndex}
                >
                  <SafeImage source={image.source} alt={image.alt} wrapperClassName="aspect-[4/5]" width={480} sizes="120px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">{category?.name ?? 'ატელიე'} · {subcategory?.name ?? 'კოლექცია'}</p>
          <h1 className="mt-3 font-display text-5xl font-light leading-none tracking-display md:text-6xl">{product.name}</h1>
          <p className="mt-3 text-[13px] text-ink/65">{product.subtitle}</p>
          <div className="mt-5 flex items-center gap-4">
            <Rating value={product.rating} count={product.reviewCount} showValue />
            <button
              type="button"
              onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-[10px] uppercase tracking-[0.12em] text-ink/65 underline underline-offset-2 hover:text-ink"
            >
              მიმოხილვები
            </button>
          </div>
          <div className="mt-6 flex items-baseline gap-3">
            <p className="font-display text-3xl tabular-nums">{formatMoney(selectedPrice)}</p>
            {product.compareAtPrice && product.compareAtPrice > selectedPrice && (
              <p className="text-sm text-ink/65 line-through">{formatMoney(product.compareAtPrice)}</p>
            )}
            <span className="ml-auto text-[9px] uppercase tracking-[0.14em] text-ink/65">ყველა გადასახადი შედის</span>
          </div>
          <p className="mt-6 border-t border-ink/10 pt-6 text-[12px] leading-[1.9] text-ink/65">{product.description}</p>

          <div className="mt-7 space-y-5">
            {product.options.map((option) => (
              <div key={option.name}>
                <div className="mb-3 flex items-baseline justify-between">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-ink/65">{option.name}</p>
                  <p className="text-[10px] text-ink/65">
                    {option.values.find((value) => value.value === selections[option.name])?.label ?? 'აირჩიეთ'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const active = selections[option.name] === value.value;
                    const available = valueAvailable(option.name, value.value);
                    const hasSwatch = Boolean(value.swatch);
                    return (
                      <button
                        key={value.value}
                        type="button"
                        onClick={() => changeOption(option.name, value.value)}
                        aria-pressed={active}
                        disabled={!available}
                        className={`relative flex items-center gap-2 border px-3.5 py-2 text-[10px] transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
                          active ? 'border-ink bg-ink text-ivory' : 'border-ink/15 text-ink/60 hover:border-ink/45'
                        }`}
                      >
                        {hasSwatch && (
                          <span
                            className="h-3 w-3 rounded-full border border-black/10"
                            style={{ backgroundColor: value.swatch }}
                            aria-hidden
                          />
                        )}
                        {value.label}
                        {!available && <span className="absolute inset-0 cursor-not-allowed" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 flex items-center gap-4">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              max={Math.max(1, Math.min(20, selectedStock))}
              disabled={selectedStock === 0}
            />
            <p className={`text-[10px] uppercase tracking-[0.12em] ${selectedStock > 0 && selectedStock <= 3 ? 'text-[#9a6a2d]' : 'text-ink/65'}`}>
              {selectedStock === 0 ? 'ამოწურულია' : selectedStock <= 3 ? `დარჩენილია ${selectedStock} ერთეული` : 'მარაგშია'}
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <Button size="lg" className="w-full" onClick={addToCart} disabled={selectedStock === 0 || adding} loading={adding} loadingLabel="ემატება…">
              კალათაში დამატება
            </Button>
            <div className="flex gap-2.5">
              <Button variant="outline" size="lg" className="flex-1" onClick={buyNow} disabled={selectedStock === 0}>
                ახლა ვიყიდი
              </Button>
              <button
                type="button"
                onClick={() => void toggleFavorite()}
                aria-label={favorite ? 'რჩეულებიდან ამოღება' : 'რჩეულებში დამატება'}
                className={`flex h-14 w-14 shrink-0 items-center justify-center border transition-colors ${favorite ? 'border-oxblood/30 bg-oxblood/[0.06]' : 'border-ink/20 hover:border-ink'}`}
              >
                <Heart className={`h-5 w-5 ${favorite ? 'fill-oxblood text-oxblood' : ''}`} strokeWidth={1.4} aria-hidden />
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 border-y border-ink/10 py-3 text-[10px] text-ink/65">
            <Truck className="h-4 w-4 text-earth" strokeWidth={1.4} aria-hidden />
            <span>უფასო მიწოდება ₾300-დან · 2–4 სამუშაო დღე</span>
          </div>

          <div className="mt-3 divide-y divide-ink/10 border-b border-ink/10">
            {accordionItems.map((item) => (
              <details key={item.title} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[11px] uppercase tracking-[0.12em] text-ink/65">
                  <span className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-earth" strokeWidth={1.3} aria-hidden />
                    {item.title}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="whitespace-pre-line pb-5 pl-7 text-[11px] leading-relaxed text-ink/65">{item.content}</p>
              </details>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3 text-[10px] text-ink/65">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em]">SKU: {selectedVariant?.sku ?? product.sku}</span>
            <span className="h-3 w-px bg-ink/15" aria-hidden />
            <span>მცირე ტირაჟი</span>
          </div>
        </div>
      </section>

      <section className="mt-20 border-y border-ink/10 bg-soft">
        <div className="container-editorial grid gap-8 py-14 md:grid-cols-[0.8fr_1.2fr] md:py-20">
          <div>
            <p className="eyebrow">ატელიეს ამბავი</p>
            <h2 className="mt-4 font-display text-4xl font-light tracking-display md:text-5xl">„{product.name}“</h2>
          </div>
          <div>
            <p className="max-w-2xl font-display text-2xl font-light leading-[1.45] tracking-display text-ink/80 md:text-3xl">
              {product.story}
            </p>
            <div className="mt-8 grid gap-4 text-[11px] leading-relaxed text-ink/65 sm:grid-cols-3">
              <div>
                <p className="mb-1 text-[8px] uppercase tracking-[0.18em] text-ink/65">მასალა</p>
                {product.materials}
              </div>
              <div>
                <p className="mb-1 text-[8px] uppercase tracking-[0.18em] text-ink/65">ზომები</p>
                {product.dimensions}
              </div>
              <div>
                <p className="mb-1 text-[8px] uppercase tracking-[0.18em] text-ink/65">მოვლა</p>
                {product.care}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="reviews" className="container-editorial mt-20 scroll-mt-32 md:mt-28">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="eyebrow">მიმოხილვები</p>
            <h2 className="mt-3 font-display text-4xl font-light tracking-display">მომხმარებელთა შეფასებები</h2>
            <div className="mt-6 flex items-center gap-4 border-y border-ink/10 py-5">
              <p className="font-display text-5xl font-light">{product.rating ? product.rating.toFixed(1) : '—'}</p>
              <div>
                <Rating value={product.rating} size="md" />
                <p className="mt-1.5 text-[10px] text-ink/65">{product.reviewCount} დადასტურებული შეფასება</p>
              </div>
            </div>
            {canReview ? (
              <Button variant="outline" size="sm" className="mt-6" onClick={() => setReviewOpen((open) => !open)}>
                {reviewOpen ? 'ფორმის დახურვა' : 'მიმოხილვის დატოვება'}
              </Button>
            ) : userReview ? (
              <p className="mt-6 text-[11px] leading-relaxed text-ink/65">
                თქვენი მიმოხილვა {userReview.status === 'approved' ? 'გამოქვეყნებულია' : userReview.status === 'pending' ? 'მოდერაციას ელოდება' : 'უარყოფილია.'}
              </p>
            ) : (
              <p className="mt-6 text-[11px] leading-relaxed text-ink/65">
                მიმოხილვა ხელმისაწვდომია მხოლოდ პროდუქტის შემძენი მომხმარებლებისთვის.
              </p>
            )}
            {reviewOpen && canReview && (
              <form onSubmit={submitReview} className="mt-6 space-y-4 border border-ink/10 p-5">
                <p className="text-[9px] uppercase tracking-[0.16em] text-ink/65">თქვენი შეფასება</p>
                <RatingInput value={reviewRating} onChange={setReviewRating} />
                <Input label="სათაური" value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} required maxLength={80} />
                <Textarea label="მიმოხილვა" value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} rows={4} required maxLength={1200} />
                {reviewError && <FormError>{reviewError}</FormError>}
                <Button type="submit" size="sm" loading={reviewSaving}>გაგზავნა</Button>
              </form>
            )}
          </div>
          <div>
            {reviews.length ? (
              <ul className="divide-y divide-ink/10 border-y border-ink/10">
                {reviews.map((review) => (
                  <li key={review.id} className="py-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-[10px] font-medium text-ivory">
                          {review.author.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                        </span>
                        <div>
                          <p className="text-[11px] font-medium">{review.author}</p>
                          <p className="mt-0.5 text-[9px] text-ink/65">
                            {formatDate(review.createdAt, 'long')}
                            {review.verifiedPurchase && ' · დადასტურებული შეძენა'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {review.status !== 'approved' && <Badge tone="warning">{review.status === 'pending' ? 'მოდერაციაში' : 'უარყოფილი'}</Badge>}
                        <Rating value={review.rating} size="xs" />
                      </div>
                    </div>
                    <h3 className="mt-4 font-display text-xl">{review.title}</h3>
                    <p className="mt-2 max-w-2xl text-[12px] leading-[1.9] text-ink/65">{review.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border border-dashed border-ink/15 p-10 text-center">
                <p className="text-[12px] text-ink/65">ჯერ არ არის მიმოხილვა. იყავით პირველი.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="container-editorial mt-24 md:mt-32">
          <Reveal className="flex items-end justify-between gap-4 border-b border-ink/15 pb-6">
            <div>
              <p className="eyebrow">შეიძლება მოგეწონოს</p>
              <h2 className="store-heading-sm mt-3">მსგავსი ობიექტები</h2>
            </div>
            <Link to={`/catalog?category=${category?.id ?? ''}`} className="text-[10px] uppercase tracking-[0.14em] text-ink/65 hover:text-ink">
              მეტის ნახვა
            </Link>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {related.map((entry) => (
              <ProductCard key={entry.id} product={entry} compact />
            ))}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-ink/10 bg-ivory/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg">{product.name}</p>
            <p className="text-[10px] text-ink/65">{formatMoney(selectedPrice)}</p>
          </div>
          <Button size="sm" onClick={addToCart} disabled={selectedStock === 0}>
            კალათაში
          </Button>
        </div>
      </div>

      <Modal open={zoomOpen} onClose={() => setZoomOpen(false)} size="lg" title={`${product.name} — გადიდებული`}>
        <div className="bg-stone">
          <SafeImage source={product.images[imageIndex]?.source ?? ''} alt={product.images[imageIndex]?.alt || product.name} wrapperClassName="aspect-[4/5]" sizes="80vw" eager />
        </div>
      </Modal>
    </>
  );
}
