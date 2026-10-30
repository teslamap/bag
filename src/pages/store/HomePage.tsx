import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, PackageCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { SafeImage } from '@/components/ui/SafeImage';
import { ProductCard } from '@/components/store/ProductCard';
import { Seo } from '@/components/system/Seo';
import { Reveal } from '@/components/system/Motion';
import { Rating } from '@/components/ui/Rating';
import { COLLECTIONS } from '@/lib/constants';
import { formatMoney } from '@/lib/utils';

export function HomePage() {
  const snapshot = useBackendSnapshot();
  const active = snapshot.products.filter((product) => product.status === 'active');
  const markedFeatured = active.filter((product) => product.featured);
  const featured = (markedFeatured.length ? markedFeatured : active).slice(0, 4);
  const markedNew = active.filter((product) => product.isNew);
  const newArrivals = (markedNew.length ? markedNew : [...active].sort((a,b) => b.createdAt.localeCompare(a.createdAt))).slice(0, 4);
  const bestsellers = active.filter((product) => product.bestseller).slice(0, 3);
  const reviews = snapshot.reviews.filter((review) => review.status === 'approved').slice(0, 3);

  return (
    <>
      <Seo description="MAKU — თბილისური ატელიე ხელნაკეთი ტყავის ჩანთებისთვის, აქსესუარებისა და სამკაულებისთვის." />

      <section className="relative overflow-hidden">
        <div className="container-editorial grid min-h-[calc(100dvh-8rem)] items-center gap-10 py-10 lg:grid-cols-12 lg:gap-6 lg:py-0">
          <div className="relative z-10 order-2 lg:order-1 lg:col-span-5">
            <Reveal>
              <p className="eyebrow flex items-center gap-3">
                <span className="h-px w-10 bg-earth/50" aria-hidden />
                კოლექცია · შემოდგომა 2026
              </p>
              <h1 className="store-heading mt-6">ობიექტები,<br />რომლებიც<br /><em className="font-light italic text-earth">დროს უძლებს</em></h1>
              <p className="mt-7 max-w-sm text-[13px] leading-relaxed text-ink/65">
                ხელით აწყობილი ტყავის ფორმები მცირე ტირაჟებად. თითოეული ნაკერი, კიდე და ტონი — ატელიეს შვიდი ხელოსნის ხელწერა.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  to="/catalog"
                  className="group inline-flex h-12 items-center gap-3 rounded-full bg-ink px-7 text-[10px] font-medium uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-inkhover"
                >
                  კოლექციის ნახვა
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <Link to="/about" className="link-underline text-[10px] uppercase tracking-[0.16em] text-ink/60 hover:text-ink">
                  ატელიეს შესახებ
                </Link>
              </div>
            </Reveal>
          </div>
          <div className="relative order-1 lg:order-2 lg:col-span-7">
            <Reveal delay={0.1} y={18}>
              <div className="relative">
                <SafeImage
                  source="hero-main"
                  alt="MAKU — ტყავის ჩანთა თბილისურ ატელიეში"
                  wrapperClassName="aspect-[4/5] w-full bg-stone lg:aspect-[5/6] lg:h-[calc(100dvh-13rem)]"
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  priority
                />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-ivory">
                  <div className="bg-ink/35 px-4 py-3 backdrop-blur-md">
                    <p className="text-[8px] uppercase tracking-[0.2em]">ატელიე · თბილისი</p>
                    <p className="mt-1 font-display text-xl">MAKU · ატელიე</p>
                  </div>
                  <Link
                    to="/catalog"
                    aria-label="კატალოგის ნახვა"
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-ivory/40 bg-ivory/10 backdrop-blur-md transition-colors hover:bg-ivory hover:text-ink"
                  >
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </Reveal>
            <div className="absolute -left-8 top-8 hidden text-[9px] uppercase tracking-[0.24em] text-ink/65 xl:flex xl:flex-col xl:items-center xl:gap-3">
              <span className="h-14 w-px bg-ink/20" aria-hidden />
              <span className="vertical-rl">Spring / Summer 26</span>
            </div>
          </div>
        </div>
        <div className="container-editorial hidden items-center justify-between border-t border-ink/10 py-4 text-[8px] uppercase tracking-[0.2em] text-ink/65 md:flex">
          <span>ხელნაკეთი საქართველოში</span>
          <span className="flex items-center gap-2"><ArrowDown className="h-3 w-3" aria-hidden /> გადაახვიეთ</span>
          <span>ხელმისაწვდომია ონლაინ და ატელიეში</span>
        </div>
      </section>

      <section className="container-editorial mt-20 md:mt-28" aria-labelledby="collections-heading">
        <Reveal className="flex flex-col justify-between gap-5 border-b border-ink/15 pb-8 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">რედაქციის არჩევანი</p>
            <h2 id="collections-heading" className="store-heading-sm mt-3">სამი კოლექცია,<br />ერთი ხელწერა</h2>
          </div>
          <Link to="/catalog" className="link-underline shrink-0 text-[10px] uppercase tracking-[0.16em] text-ink/65 hover:text-ink">
            ყველა პროდუქტი <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {COLLECTIONS.map((collection, index) => (
            <Reveal key={collection.id} delay={index * 0.08}>
              <Link to={collection.href} className="group block">
                <div className="relative overflow-hidden bg-stone">
                  <SafeImage
                    source={collection.image}
                    alt={collection.title}
                    wrapperClassName="aspect-[3/4]"
                    className="transition-transform duration-[1.4s] ease-editorial group-hover:scale-[1.04]"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 to-transparent p-6 pt-20 text-ivory">
                    <p className="text-[8px] uppercase tracking-[0.22em] text-ivory/65">{collection.eyebrow}</p>
                    <h3 className="mt-2 font-display text-3xl font-light">{collection.title}</h3>
                    <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-ivory/65">{collection.description}</p>
                  </div>
                  <span className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-ivory/40 text-ivory opacity-0 transition-all duration-500 group-hover:opacity-100">
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-editorial mt-24 md:mt-32" aria-labelledby="featured-heading">
        <Reveal className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">ატელიეს რჩეულები</p>
            <h2 id="featured-heading" className="store-heading-sm mt-3">ობიექტები</h2>
          </div>
          <span className="hidden text-right text-[10px] leading-relaxed text-ink/65 md:block">მცირე ტირაჟი<br />ხელით დასრულებული</span>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-5">
          {featured.length === 0 && <p className="col-span-full py-8 text-center text-sm text-ink/65">პროდუქტები ჯერ არ დამატებულა.</p>}
          {featured.map((product, index) => (
            <Reveal key={product.id} delay={index * 0.06}>
              <ProductCard product={product} priority={index < 2} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mt-24 bg-forest text-ivory md:mt-32">
        <div className="container-editorial grid gap-0 lg:grid-cols-2">
          <div className="order-2 flex flex-col justify-center py-16 lg:order-1 lg:py-24 lg:pr-16">
            <Reveal>
              <p className="text-[9px] uppercase tracking-[0.26em] text-champagne">ატელიეს შიგნით</p>
              <h2 className="mt-5 font-display text-4xl font-light leading-[1.03] tracking-display md:text-6xl">
                ნელი წარმოება,<br />გრძელი სიცოცხლე
              </h2>
              <p className="mt-6 max-w-md text-[13px] leading-relaxed text-ivory/65">
                არ ვამზადებთ სეზონური ტემპით. თითოეული ფორმა იწყება ქაღალდზე, შემდეგ ტყავში გადადის და ბოლოს — თქვენს ყოველდღიურობაში რჩება. ჩვენი მიზანია, ნივთი უფრო ლამაზი გახდეს ცვეთისას.
              </p>
              <div className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-ivory/15 pt-7">
                <div>
                  <p className="font-display text-3xl font-light">2018</p>
                  <p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-ivory/65">დაარსდა</p>
                </div>
                <div>
                  <p className="font-display text-3xl font-light">07</p>
                  <p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-ivory/65">ხელოსანი</p>
                </div>
                <div>
                  <p className="font-display text-3xl font-light">100%</p>
                  <p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-ivory/65">ადგილობრივი</p>
                </div>
              </div>
              <Link to="/about" className="link-underline mt-9 inline-flex text-[10px] uppercase tracking-[0.16em] text-ivory/70 hover:text-ivory">
                ატელიეს ისტორია <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Reveal>
          </div>
          <div className="order-1 lg:order-2">
            <SafeImage
              source="craft-01"
              alt="ატელიე — ტყავის ხელით დამუშავება"
              wrapperClassName="h-[55vh] min-h-[420px] lg:h-full lg:min-h-[640px]"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="container-editorial mt-24 md:mt-32" aria-labelledby="new-heading">
        <Reveal className="flex flex-col justify-between gap-5 border-b border-ink/15 pb-8 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">ახლად ჩამოსული</p>
            <h2 id="new-heading" className="store-heading-sm mt-3">ახალი ფორმები</h2>
          </div>
          <Link to="/catalog?filter=new" className="link-underline text-[10px] uppercase tracking-[0.16em] text-ink/65 hover:text-ink">
            ყველა ახალი <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-5">
          {newArrivals.length === 0 && <p className="col-span-full py-8 text-center text-sm text-ink/65">ახალი პროდუქტები ჯერ არ დამატებულა.</p>}
          {newArrivals.map((product, index) => (
            <Reveal key={product.id} delay={index * 0.06}>
              <ProductCard product={product} compact />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-editorial mt-24 md:mt-32">
        <div className="grid items-stretch gap-0 border border-ink/10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative min-h-[420px]">
            <SafeImage
              source="editorial-woman"
              alt="MAKU — რედაქციული კამპანია"
              wrapperClassName="absolute inset-0"
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
          </div>
          <div className="flex flex-col justify-center p-8 md:p-14">
            <p className="eyebrow">ატელიეს დღიური</p>
            <h2 className="mt-4 font-display text-4xl font-light leading-tight tracking-display md:text-5xl">
              „ნივთი მაშინ იწყებს ცხოვრებას, როცა მას ატარებენ.“
            </h2>
            <p className="mt-5 text-[12px] leading-relaxed text-ink/65">
              ინტერვიუ ატელიეს დამფუძნებელთან ფორმის, დროისა და ხელის ნაკვალევის შესახებ. კამპანია გადაღებულია თბილისში, ჩვენსავე სამუშაო სივრცეში.
            </p>
            <Link to="/about" className="mt-7 inline-flex items-center gap-2 border-b border-ink/25 pb-1 text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-ink">
              სრულად წაკითხვა <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-24 md:mt-32" aria-labelledby="bestsellers-heading">
        <div className="container-editorial">
          <Reveal className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">ყველაზე მოთხოვნადი</p>
              <h2 id="bestsellers-heading" className="store-heading-sm mt-3">ატელიეს კლასიკა</h2>
            </div>
          </Reveal>
        </div>
        <div className="container-editorial mt-8 grid gap-5 md:grid-cols-3">
          {bestsellers.length === 0 && <p className="col-span-full py-8 text-center text-sm text-ink/65">პროდუქტები ჯერ არ დამატებულა.</p>}
          {bestsellers.map((product, index) => (
            <Reveal key={product.id} delay={index * 0.07}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="container-editorial mt-24 border-y border-ink/10 py-14 md:mt-32 md:py-20" aria-labelledby="reviews-heading">
          <Reveal className="grid gap-10 lg:grid-cols-[0.6fr_1.4fr]">
            <div>
              <p className="eyebrow">მომხმარებლების ხმები</p>
              <h2 id="reviews-heading" className="store-heading-sm mt-3">ატელიეს<br />შეფასებები</h2>
              <div className="mt-6 flex items-center gap-3">
                <Rating value={4.8} size="md" />
                <span className="text-[11px] text-ink/65">{snapshot.reviews.filter((r) => r.status === 'approved').length} დადასტურებული მიმოხილვა</span>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {reviews.map((review) => (
                <article key={review.id} className="border-l border-ink/10 pl-5">
                  <Rating value={review.rating} size="xs" />
                  <h3 className="mt-3 font-display text-lg leading-snug">{review.title}</h3>
                  <p className="mt-2 line-clamp-4 text-[11px] leading-relaxed text-ink/65">{review.body}</p>
                  <p className="mt-4 text-[9px] uppercase tracking-[0.14em] text-ink/65">{review.author}</p>
                </article>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      <section className="container-editorial mt-20 grid gap-8 border-b border-ink/10 pb-20 sm:grid-cols-3 md:mt-24">
        {[
          { icon: PackageCheck, title: 'უფასო მიწოდება', text: `${formatMoney(snapshot.settings.freeShippingThreshold)}-დან, მთელი საქართველოს მასშტაბით.` },
          { icon: ShieldCheck, title: 'უსაფრთხო შეკვეთა', text: 'გადახდა მიღებისას — ჯერ ნახავთ, შემდეგ იხდით.' },
          { icon: Sparkles, title: 'სამუდამო მოვლა', text: 'ატელიეს მოვლისა და შეკეთების სერვისი უფასოა.' },
        ].map((item) => (
          <div key={item.title} className="flex gap-4">
            <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-earth" strokeWidth={1.25} aria-hidden />
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.16em]">{item.title}</h3>
              <p className="mt-2 text-[11px] leading-relaxed text-ink/65">{item.text}</p>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
