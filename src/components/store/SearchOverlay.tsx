import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBackendSnapshot } from '@/state/backend';
import { useUiStore } from '@/state/ui';
import { useDebouncedValue } from '@/hooks/useCommerce';
import { POPULAR_SEARCHES } from '@/lib/constants';
import { SafeImage } from '@/components/ui/SafeImage';
import { formatMoney } from '@/lib/utils';

export function SearchOverlay() {
  const open = useUiStore((state) => state.searchOpen);
  const close = useUiStore((state) => state.closeSearch);
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim().toLowerCase(), 180);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [open, close]);

  const categories = snapshot.categories.filter((category) => !category.parentId);
  const results = debounced.length >= 2
    ? snapshot.products
        .filter((product) => {
          const category = snapshot.categories.find((entry) => entry.id === product.categoryId)?.name ?? '';
          return [product.name, product.subtitle, product.description, product.tags.join(' '), category]
            .join(' ')
            .toLowerCase()
            .includes(debounced);
        })
        .slice(0, 5)
    : [];

  const submit = (value: string) => {
    const trimmed = value.trim();
    close();
    navigate(trimmed ? `/catalog?q=${encodeURIComponent(trimmed)}` : '/catalog');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col bg-ivory"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="ძებნა"
        >
          <div className="container-editorial flex h-20 items-center justify-between border-b border-ink/10">
            <span className="text-[10px] uppercase tracking-[0.24em] text-ink/65">ძებნა</span>
            <button
              type="button"
              onClick={close}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 transition-colors hover:border-ink/40"
              aria-label="ძებნის დახურვა"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <motion.div
            className="container-editorial w-full flex-1 overflow-y-auto pb-20 pt-10 md:pt-16"
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit(query);
              }}
              className="mx-auto max-w-3xl"
            >
              <div className="flex items-center gap-4 border-b border-ink/30 pb-3">
                <Search className="h-6 w-6 shrink-0 text-ink/65" aria-hidden />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="მოძებნეთ ჩანთა, აქსესუარი, კოლექცია…"
                  className="w-full border-0 bg-transparent font-display text-3xl font-light tracking-display text-ink placeholder:text-ink/55 focus:outline-none md:text-5xl"
                  aria-label="საძიებო სიტყვა"
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} aria-label="ტექსტის გასუფთავება">
                    <X className="h-5 w-5 text-ink/65" aria-hidden />
                  </button>
                )}
              </div>
            </form>

            {debounced.length >= 2 ? (
              <div className="mx-auto mt-12 max-w-3xl">
                <p className="eyebrow mb-6">შედეგები · {results.length}</p>
                {results.length ? (
                  <ul className="divide-y divide-ink/10 border-y border-ink/10">
                    {results.map((product) => (
                      <li key={product.id}>
                        <Link
                          to={`/product/${product.slug}`}
                          onClick={close}
                          className="group flex items-center gap-5 py-4 transition-colors hover:bg-ink/[0.025]"
                        >
                          <SafeImage
                            source={product.images[0]?.source ?? ''}
                            alt={product.name}
                            wrapperClassName="h-20 w-16 shrink-0 bg-stone"
                            width={480}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-xl">{product.name}</p>
                            <p className="truncate text-[11px] text-ink/65">{product.subtitle}</p>
                          </div>
                          <span className="text-[12px] tabular-nums">{formatMoney(product.price)}</span>
                          <ArrowUpRight className="h-4 w-4 text-ink/65 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-10 text-sm text-ink/65">„{query.trim()}“ — შედეგი ვერ მოიძებნა. სცადეთ სხვა სიტყვა.</p>
                )}
                <button
                  type="button"
                  onClick={() => submit(query)}
                  className="mt-6 text-[11px] uppercase tracking-[0.16em] underline decoration-ink/25 underline-offset-4 transition-colors hover:text-earth"
                >
                  ყველა შედეგის ნახვა
                </button>
              </div>
            ) : (
              <div className="mx-auto mt-14 grid max-w-4xl gap-12 md:grid-cols-2">
                <div>
                  <p className="eyebrow mb-5">პოპულარული ძებნები</p>
                  <ul className="space-y-3">
                    {POPULAR_SEARCHES.map((term) => (
                      <li key={term}>
                        <button
                          type="button"
                          onClick={() => submit(term)}
                          className="group flex items-center gap-3 text-left text-sm text-ink/60 transition-colors hover:text-ink"
                        >
                          <span className="h-px w-5 bg-ink/20 transition-all group-hover:w-8" aria-hidden />
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="eyebrow mb-5">კატეგორიები</p>
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <Link
                          to={`/catalog?category=${category.id}`}
                          onClick={close}
                          className="text-sm text-ink/60 transition-colors hover:text-ink"
                        >
                          {category.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
