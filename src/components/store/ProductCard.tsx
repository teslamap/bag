import { Link, useNavigate } from 'react-router-dom';
import { Heart, Plus } from 'lucide-react';
import type { Product } from '@/lib/types';
import { Badge } from '@/components/ui/Feedback';
import { Rating } from '@/components/ui/Rating';
import { SafeImage } from '@/components/ui/SafeImage';
import { useBackendSnapshot } from '@/state/backend';
import { backend } from '@/backend';
import { useCartStore } from '@/state/cart';
import { toast } from '@/state/toast';
import { discountPercent, formatMoney, getProductStock, imageSrc } from '@/lib/utils';

export function ProductCard({
  product,
  priority = false,
  compact = false,
}: {
  product: Product;
  priority?: boolean;
  compact?: boolean;
}) {
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const add = useCartStore((state) => state.add);
  const favorite = Boolean(snapshot.session && snapshot.users.find((u) => u.id === snapshot.session?.id)?.favoriteProductIds.includes(product.id));
  const soldOut = getProductStock(product) <= 0;
  const sale = discountPercent(product.price, product.compareAtPrice);

  const addToCart = async () => {
    const variant = product.variants.find((entry) => entry.stock > 0);
    if (!variant) {
      toast('პროდუქტი ამჟამად მიუწვდომელია', { variant: 'warning' });
      return;
    }
    add(product.id, variant.id, 1);
    toast(`${product.name} დაემატა კალათას`, { message: 'შეგიძლიათ გააგრძელოთ შეძენა ან გადახდაზე გადახვიდეთ.' });
  };

  const toggleFavorite = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!snapshot.session) {
      navigate(`/auth?mode=login&next=${encodeURIComponent(`/product/${product.slug}`)}`);
      return;
    }
    try {
      const added = await backend.toggleFavorite(product.id);
      toast(added ? 'დაემატა რჩეულებს' : 'ამოღებულია რჩეულებიდან', { variant: 'info' });
    } catch (error) {
      toast('ვერ შეინახა', { message: error instanceof Error ? error.message : undefined, variant: 'error' });
    }
  };

  return (
    <article className="group relative">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative overflow-hidden bg-stone/60">
          <SafeImage
            source={product.images[0]?.source ?? ''}
            alt={product.images[0]?.alt || product.name}
            wrapperClassName={compact ? 'aspect-[4/5]' : 'aspect-[3/4]'}
            className="transition-transform duration-[1.2s] ease-editorial group-hover:scale-[1.035]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />
          {product.images[1] && (
            <img
              src={imageSrc(product.images[1].source, 480)}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
              aria-hidden
            />
          )}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {sale && <Badge tone="danger">-{sale}%</Badge>}
            {product.isNew && <Badge tone="accent">ახალი</Badge>}
            {product.bestseller && <Badge tone="neutral">ბესტსელერი</Badge>}
            {soldOut && <Badge tone="neutral">ამოწურულია</Badge>}
          </div>
          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 transition-all duration-500 group-hover:opacity-100 max-md:opacity-100">
            <button
              type="button"
              onClick={toggleFavorite}
              aria-label={favorite ? 'რჩეულებიდან ამოღება' : 'რჩეულებში დამატება'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ivory/90 text-ink shadow-sm backdrop-blur transition-colors hover:bg-ivory"
            >
              <Heart className={`h-4 w-4 ${favorite ? 'fill-oxblood text-oxblood' : ''}`} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          {!soldOut && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                void addToCart();
              }}
              className="absolute inset-x-3 bottom-3 flex h-10 translate-y-3 items-center justify-center gap-2 rounded-full bg-ivory/95 text-[10px] font-medium uppercase tracking-[0.14em] text-ink opacity-0 shadow-sm backdrop-blur transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 max-md:translate-y-0 max-md:opacity-100"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              კალათაში
            </button>
          )}
        </div>
        <div className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-normal leading-tight tracking-display">{product.name}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-ink/65">{product.subtitle}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium tabular-nums">{formatMoney(product.price)}</p>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <p className="mt-1 text-[10px] text-ink/65 line-through">{formatMoney(product.compareAtPrice)}</p>
              )}
            </div>
          </div>
          {product.reviewCount > 0 && (
            <div className="mt-2.5">
              <Rating value={product.rating} count={product.reviewCount} size="xs" />
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
