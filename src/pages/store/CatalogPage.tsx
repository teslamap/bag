import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { ProductCard } from '@/components/store/ProductCard';
import { Seo } from '@/components/system/Seo';
import { Drawer, EmptyState, Badge } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { SafeImage } from '@/components/ui/SafeImage';
import { cn, getProductStock, imageSrc } from '@/lib/utils';

const PAGE_SIZE = 9;

const PRICE_RANGES = [
  { id: 'all', label: 'ყველა ფასი', min: 0, max: Infinity },
  { id: 'under-200', label: '200 ₾-მდე', min: 0, max: 20_000 },
  { id: '200-500', label: '200 – 500 ₾', min: 20_000, max: 50_000 },
  { id: '500-1000', label: '500 – 1000 ₾', min: 50_000, max: 100_000 },
  { id: 'over-1000', label: '1000 ₾ და მეტი', min: 100_000, max: Infinity },
];

const FILTER_TITLES: Record<string, string> = {
  new: 'ახალი კოლექცია',
  bestsellers: 'ბესტსელერები',
  sale: 'ფასდაკლებები',
  featured: 'ატელიეს რჩეულები',
};

const SORT_OPTIONS = [
  { value: 'featured', label: 'რჩეულები' },
  { value: 'new', label: 'უახლესი' },
  { value: 'price-asc', label: 'ფასი: ზრდადობით' },
  { value: 'price-desc', label: 'ფასი: კლებადობით' },
  { value: 'rating', label: 'შეფასებით' },
];

export function CatalogPage() {
  const snapshot = useBackendSnapshot();
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('category') ?? '';
  const subcategoryId = params.get('sub') ?? '';
  const filter = params.get('filter') ?? '';
  const query = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'featured';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const [priceRange, setPriceRange] = useState('all');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const parentCategories = snapshot.categories.filter((category) => !category.parentId && category.active);
  const activeCategory = snapshot.categories.find((category) => category.id === categoryId);
  const activeSubcategory = snapshot.categories.find((category) => category.id === subcategoryId);
  const heroImage = activeSubcategory?.image ?? activeCategory?.image ?? 'editorial-02';

  const colors = useMemo(() => {
    const map = new Map<string, { value: string; label: string; swatch?: string; count: number }>();
    for (const product of snapshot.products) {
      const option = product.options.find((entry) => entry.values.some((value) => value.swatch));
      if (!option) continue;
      for (const value of option.values) {
        const current = map.get(value.value);
        if (current) current.count += 1;
        else map.set(value.value, { ...value, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [snapshot.products]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const range = PRICE_RANGES.find((entry) => entry.id === priceRange) ?? PRICE_RANGES[0];
    let list = snapshot.products.filter((product) => product.status === 'active');

    if (categoryId) list = list.filter((product) => product.categoryId === categoryId || product.subcategoryId === categoryId);
    if (subcategoryId) list = list.filter((product) => product.subcategoryId === subcategoryId);
    if (filter === 'new') list = list.filter((product) => product.isNew);
    if (filter === 'bestsellers') list = list.filter((product) => product.bestseller);
    if (filter === 'featured') list = list.filter((product) => product.featured);
    if (filter === 'sale') list = list.filter((product) => product.compareAtPrice && product.compareAtPrice > product.price);
    if (query) {
      list = list.filter((product) => {
        const category = snapshot.categories.find((entry) => entry.id === product.categoryId)?.name ?? '';
        const subcategory = snapshot.categories.find((entry) => entry.id === product.subcategoryId)?.name ?? '';
        return [product.name, product.subtitle, product.description, product.story, product.materials, category, subcategory, ...product.tags]
          .join(' ')
          .toLowerCase()
          .includes(search);
      });
    }
    if (priceRange !== 'all') list = list.filter((product) => product.price >= range.min && product.price < range.max);
    if (inStockOnly) list = list.filter((product) => getProductStock(product) > 0);
    if (selectedColors.length) {
      list = list.filter((product) =>
        selectedColors.every((color) =>
          product.options.some((option) => option.values.some((value) => value.value === color && value.swatch)),
        ),
      );
    }

    const sorted = [...list];
    switch (sort) {
      case 'new':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
        break;
      default:
        sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || Number(b.bestseller) - Number(a.bestseller));
    }
    return sorted;
  }, [snapshot.products, snapshot.categories, categoryId, subcategoryId, filter, query, sort, priceRange, inStockOnly, selectedColors]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const selectCategory = (parent: string, child?: string) => {
    const next = new URLSearchParams(params);
    if (child) {
      next.set('category', parent);
      next.set('sub', child);
    } else if (parent) {
      next.set('category', parent);
      next.delete('sub');
    } else {
      next.delete('category');
      next.delete('sub');
    }
    next.delete('page');
    setParams(next);
  };

  const resetFilters = () => {
    setPriceRange('all');
    setSelectedColors([]);
    setInStockOnly(false);
    const next = new URLSearchParams(params);
    next.delete('category');
    next.delete('sub');
    next.delete('filter');
    next.delete('q');
    next.delete('page');
    setParams(next);
  };

  const activeFilterCount = (priceRange !== 'all' ? 1 : 0) + selectedColors.length + (inStockOnly ? 1 : 0) + (categoryId ? 1 : 0) + (subcategoryId ? 1 : 0);

  const title = query
    ? `ძებნა: ${query}`
    : activeSubcategory?.name ?? activeCategory?.name ?? (filter ? FILTER_TITLES[filter] : 'მთელი კოლექცია');
  const eyebrow = activeSubcategory?.nameEn ?? activeCategory?.nameEn ?? 'The collection';

  const filterContent = (
    <div className="space-y-8">
      <div>
        <h3 className="eyebrow mb-4">კატეგორია</h3>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => selectCategory('')}
              className={cn('py-1 text-[12px] transition-colors hover:text-ink', !categoryId ? 'text-ink' : 'text-ink/65')}
            >
              ყველა
            </button>
          </li>
          {parentCategories.map((category) => {
            const children = snapshot.categories.filter((entry) => entry.parentId === category.id);
            return (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => selectCategory(category.id)}
                  className={cn('py-1 text-[12px] transition-colors hover:text-ink', categoryId === category.id && !subcategoryId ? 'text-ink' : 'text-ink/65')}
                >
                  {category.name}
                </button>
                {children.length > 0 && (categoryId === category.id || !categoryId) && (
                  <ul className="ml-3 border-l border-ink/10 pl-3">
                    {children.map((child) => (
                      <li key={child.id}>
                        <button
                          type="button"
                          onClick={() => selectCategory(category.id, child.id)}
                          className={cn('py-1 text-[11px] transition-colors hover:text-ink', subcategoryId === child.id ? 'text-ink' : 'text-ink/65')}
                        >
                          {child.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <h3 className="eyebrow mb-4">ფასი</h3>
        <div className="space-y-2">
          {PRICE_RANGES.map((range) => (
            <label key={range.id} className="flex cursor-pointer items-center gap-3 text-[12px] text-ink/60">
              <input
                type="radio"
                name="price-range"
                checked={priceRange === range.id}
                onChange={() => setPriceRange(range.id)}
                className="h-3.5 w-3.5 accent-ink"
              />
              {range.label}
            </label>
          ))}
        </div>
      </div>
      {colors.length > 0 && (
        <div>
          <h3 className="eyebrow mb-4">ფერი</h3>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() =>
                  setSelectedColors((current) =>
                    current.includes(color.value) ? current.filter((entry) => entry !== color.value) : [...current, color.value],
                  )
                }
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] transition-colors',
                  selectedColors.includes(color.value) ? 'border-ink bg-ink text-ivory' : 'border-ink/15 text-ink/65 hover:border-ink/40',
                )}
                aria-pressed={selectedColors.includes(color.value)}
              >
                <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: color.swatch }} aria-hidden />
                {color.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="eyebrow mb-4">ხელმისაწვდომობა</h3>
        <label className="flex cursor-pointer items-center gap-3 text-[12px] text-ink/60">
          <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} className="h-3.5 w-3.5 accent-ink" />
          მხოლოდ მარაგში
        </label>
      </div>
      {activeFilterCount > 0 && (
        <Button variant="outline" size="sm" onClick={resetFilters} className="w-full">
          ფილტრების გასუფთავება
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Seo
        title={title}
        description={activeCategory?.description ?? 'MAKU-ს კოლექცია — ხელნაკეთი ტექნიკის ჩანთები, აქსესუარები და სამკაულები.'}
      />
      <section className="border-b border-ink/10">
        <div className="relative isolate overflow-hidden">
          <SafeImage
            source={heroImage}
            alt={title}
            wrapperClassName="absolute inset-0 -z-10"
            className="opacity-25"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ivory via-ivory/85 to-ivory/20" />
          <div className="container-editorial py-16 md:py-24">
            <nav className="mb-8 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-ink/65" aria-label="პურის ნამცხვარი">
              <Link to="/" className="hover:text-ink">მთავარი</Link>
              <span>/</span>
              <Link to="/catalog" className="hover:text-ink">მაღაზია</Link>
              {activeCategory && (
                <>
                  <span>/</span>
                  <span className="text-ink/60">{activeCategory.name}</span>
                </>
              )}
              {activeSubcategory && (
                <>
                  <span>/</span>
                  <span className="text-ink/60">{activeSubcategory.name}</span>
                </>
              )}
            </nav>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="store-heading-sm mt-4">{title}</h1>
            <p className="mt-5 max-w-md text-[12px] leading-relaxed text-ink/65">
              {activeCategory?.description ?? activeSubcategory?.description ?? 'ატელიეს სრული კოლექცია — ტყავი, აბრეშუმი, ვერცხლი და ყოველდღიურობისთვის შექმნილი ფორმები.'}
            </p>
          </div>
        </div>
      </section>

      <section className="container-editorial mt-10 md:mt-14">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center gap-2 border border-ink/15 px-4 py-2 text-[10px] uppercase tracking-[0.12em] lg:hidden"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              ფილტრები
              {activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[8px] text-ivory">{activeFilterCount}</span>}
            </button>
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink/65">{filtered.length} პროდუქტი</p>
          </div>
          <div className="flex items-center gap-3">
            {query && (
              <Badge tone="neutral" className="normal-case tracking-normal">
                „{query}“
                <button type="button" onClick={() => updateParam('q')} aria-label="ძებნის გასუფთავება" className="ml-1 text-ink/65 hover:text-ink">
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </Badge>
            )}
            <label htmlFor="catalog-sort" className="sr-only">სორტირება</label>
            <div className="relative">
              <select
                id="catalog-sort"
                value={sort}
                onChange={(event) => updateParam('sort', event.target.value)}
                className="appearance-none border-0 bg-transparent pr-6 text-[10px] uppercase tracking-[0.12em] text-ink/60 focus:outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/65" aria-hidden />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-12 lg:grid-cols-[210px_1fr]">
          <aside className="hidden lg:block" aria-label="ფილტრები">
            <div className="sticky top-28">{filterContent}</div>
          </aside>

          <div>
            {visible.length ? (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 md:gap-x-5">
                  {visible.map((product, index) => (
                    <ProductCard key={product.id} product={product} priority={index < 3} />
                  ))}
                </div>
                {pageCount > 1 && (
                  <nav className="mt-16 flex items-center justify-center gap-2" aria-label="გვერდები">
                    <button
                      type="button"
                      onClick={() => updateParam('page', String(safePage - 1))}
                      disabled={safePage === 1}
                      className="flex h-9 w-9 items-center justify-center border border-ink/15 transition-colors hover:border-ink disabled:opacity-30"
                      aria-label="წინა გვერდი"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                    {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                      <button
                        key={number}
                        type="button"
                        onClick={() => updateParam('page', String(number))}
                        aria-current={number === safePage ? 'page' : undefined}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center border text-[11px] transition-colors',
                          number === safePage ? 'border-ink bg-ink text-ivory' : 'border-ink/15 hover:border-ink',
                        )}
                      >
                        {number}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => updateParam('page', String(safePage + 1))}
                      disabled={safePage === pageCount}
                      className="flex h-9 w-9 items-center justify-center border border-ink/15 transition-colors hover:border-ink disabled:opacity-30"
                      aria-label="შემდეგი გვერდი"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                  </nav>
                )}
              </>
            ) : (
              <EmptyState
                eyebrow="შედეგი ვერ მოიძებნა"
                title="ამ ფილტრებით პროდუქტი არ არის"
                description="შეცვალეთ ფილტრები ან დაათვალიერეთ მთელი კოლექცია."
                action={<Button variant="outline" size="sm" onClick={resetFilters}>ფილტრების გასუფთავება</Button>}
              />
            )}
          </div>
        </div>
      </section>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="ფილტრები"
        eyebrow={`${filtered.length} პროდუქტი`}
        width="max-w-sm"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={resetFilters}>გასუფთავება</Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>ნახვა</Button>
          </div>
        }
      >
        <div className="px-6 py-6">{filterContent}</div>
      </Drawer>
    </>
  );
}
