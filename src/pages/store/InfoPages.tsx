import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { toast } from '@/state/toast';
import { Seo } from '@/components/system/Seo';
import { SafeImage } from '@/components/ui/SafeImage';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { InlineNotice } from '@/components/ui/Feedback';
import { Reveal } from '@/components/system/Motion';
import { formatMoney } from '@/lib/utils';

function InfoHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  image: string;
  imageAlt: string;
}) {
  return (
    <section className="container-editorial border-b border-ink/10 pb-10 pt-8 md:pb-14 md:pt-10">
      <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="store-heading-sm mt-5">{title}</h1>
          <p className="mt-6 max-w-lg text-[13px] leading-relaxed text-ink/65">{description}</p>
        </div>
        <SafeImage
          source={image}
          alt={imageAlt}
          wrapperClassName="aspect-[16/10] w-full bg-stone/60 lg:aspect-[4/3]"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>
    </section>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-5 text-[13px] leading-[1.9] text-ink/60">{children}</div>;
}

function NumberedList({ items }: { items: Array<{ title: string; text: string }> }) {
  return (
    <ol className="divide-y divide-ink/10 border-y border-ink/10">
      {items.map((item, index) => (
        <li key={item.title} className="grid gap-3 py-6 sm:grid-cols-[60px_1fr] sm:gap-6">
          <span className="font-display text-3xl font-light text-earth">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <h3 className="font-display text-xl">{item.title}</h3>
            <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-ink/65">{item.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AboutPage() {
  return (
    <>
      <Seo
        title="ატელიე"
        description="MAKU — თბილისური ატელიე, სადაც ხელით იქმნება ტყავის ჩანთები, აქსესუარები და სამკაულები მცირე ტირაჟებად."
      />
      <InfoHero
        eyebrow="ატელიე · თბილისი · 2018"
        title={<>რვა წელი,<br />ერთი ხელწერა</>}
        description="MAKU დაიბადა აბაშიძის ქუჩის პატარა სახელოსნოში, სადაც ტყავის სუნი, ხელის ნაკერი და ნელა მომწიფებული იდეები ერთ სივრცეში შეიკრიბა. დღეს ჩვენ ვქმნით ობიექტებს, რომლებიც ყოველდღიურობას უფრო ხელშესახებს ხდის."
        image="editorial-brand"
        imageAlt="MAKU-ს ატელიე თბილისში"
      />

      <section className="container-editorial py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="eyebrow">ფილოსოფია</p>
            <h2 className="store-heading-sm mt-4">ნელა,<br />მაგრამ<br />სამუდამოდ</h2>
          </div>
          <Prose>
            <p className="font-display text-2xl leading-snug text-ink md:text-3xl">
              „ჩვენ არ ვქმნით სეზონურ პროდუქტს. ვქმნით ობიექტს, რომელიც დროთა განმავლობაში უფრო პირადი ხდება.“
            </p>
            <p>
              ყველა ჩანთა იწყება ტყავის შერჩევით — იტალიური ვეგეტაბლურად გარუჯული ტყავი, რომელიც წლების განმავლობაში იძენს
              ღრმა, ინდივიდუალურ ტონს. ჩვენ არ ვმალავთ ნაკერს, ბოჭკოს ან ხელის კვალს. პირიქით — ეს არის ჩვენი ხელწერა.
            </p>
            <p>
              ატელიეში შვიდი ხელოსანი მუშაობს. თითოეული პროდუქტი გადის ოცდაორ ხელით შესრულებულ ოპერაციას, სანამ სახელს
              მიიღებს. წარმოების მოცულობა განზრახ შეზღუდულია: თვეში მხოლოდ რამდენიმე ასეული ობიექტი ტოვებს ატელიეს.
            </p>
          </Prose>
        </div>
      </section>

      <section className="border-y border-ink/10 bg-soft">
        <div className="container-editorial grid grid-cols-2 gap-px bg-ink/10 md:grid-cols-4">
          {[
            { value: '2018', label: 'დაარსების წელი' },
            { value: '7', label: 'ხელოსანი ატელიეში' },
            { value: '22', label: 'ხელით ოპერაცია' },
            { value: '100%', label: 'ადგილობრივი წარმოება' },
          ].map((stat) => (
            <div key={stat.label} className="bg-soft px-5 py-8 text-center md:py-10">
              <p className="font-display text-4xl font-light tracking-display md:text-5xl">{stat.value}</p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.16em] text-ink/65">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-editorial py-14 md:py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { image: 'craft-01', title: 'შერჩევა', text: 'ტყავი, ძაფი და ფურნიტურა — ყველა მასალა ხელით მოწმდება.' },
            { image: 'craft-02', title: 'ფორმა', text: 'თითოეული ფორმა იჭრება ერთი ხელოსნის მიერ, ერთი დღის განმავლობაში.' },
            { image: 'craft-03', title: 'ნაკერი', text: 'ხელის ნაკერი და დაუმთავრებელი კიდე — დროსთან ერთად უფრო ლამაზი.' },
          ].map((entry, index) => (
            <Reveal key={entry.title} delay={index * 0.08}>
              <div className="group">
                <SafeImage source={entry.image} alt={entry.title} wrapperClassName="aspect-[4/5] bg-stone/60" sizes="(max-width: 768px) 100vw, 33vw" />
                <p className="mt-5 text-[9px] uppercase tracking-[0.18em] text-earth">0{index + 1} · პროცესი</p>
                <h3 className="mt-2 font-display text-2xl">{entry.title}</h3>
                <p className="mt-2 text-[12px] leading-relaxed text-ink/65">{entry.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-editorial pb-16 md:pb-24">
        <div className="grid items-center gap-8 border border-ink/10 bg-forest p-6 text-ivory md:grid-cols-2 md:p-10">
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] text-champagne">ვიზიტი</p>
            <h2 className="mt-4 font-display text-4xl font-light leading-tight tracking-display md:text-5xl">
              შემოგვიარეთ<br />ატელიეში
            </h2>
            <p className="mt-4 max-w-md text-[12px] leading-relaxed text-ivory/65">
              აბაშიძის ქ. 24, თბილისი. ორშაბათიდან შაბათამდე, 11:00–19:00. შეგიძლიათ ნახოთ ტყავის სინჯები, შეარჩიოთ ფერი და
              დააკვირდეთ პროცესს.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-ivory/30 px-6 text-[10px] uppercase tracking-[0.16em] text-ivory transition-colors hover:bg-ivory hover:text-ink"
            >
              კონტაქტი <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <SafeImage source="atelier" alt="ატელიეს ინტერიერი" wrapperClassName="aspect-[4/3] bg-forest/50" sizes="(max-width: 768px) 100vw, 50vw" />
        </div>
      </section>
    </>
  );
}

export function ContactPage() {
  const { settings } = useBackendSnapshot();
  const [form, setForm] = useState({ name: '', email: '', topic: 'შეკვეთა', message: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (form.name.trim().length < 2) return setError('შეიყვანეთ სახელი.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) return setError('ელფოსტა არასწორია.');
    if (form.message.trim().length < 10) return setError('მოგვიყევით ცოტა მეტი — მინიმუმ 10 სიმბოლო.');
    const subject = `MAKU · ${form.topic} · ${form.name}`;
    const body = `${form.message}\n\n— ${form.name}\n${form.email}`;
    window.location.href = `mailto:${settings.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
    toast('წერილი მზადაა', { message: 'გაიხსნა ელფოსტის აპლიკაცია. თუ არ გაიხსნა, მოგვწერეთ პირდაპირ hello@maku.ge-ზე.' });
  };

  return (
    <>
      <Seo title="კონტაქტი" description="დაუკავშირდით MAKU-ს ატელიეს — შეკვეთები, მიწოდება, პირადი კონსულტაცია." />
      <InfoHero
        eyebrow="კონტაქტი"
        title={<>მოგვწერეთ<br />ან შემოგვიარეთ</>}
        description="შეკვეთის სტატუსი, ზომის შერჩევა, პირადი შეკვეთა თუ უბრალოდ კითხვა — ატელიეს გუნდი პასუხობს სამუშაო დღეებში, 24 საათის განმავლობაში."
        image="editorial-woman"
        imageAlt="MAKU-ს ატელიეს გუნდი"
      />

      <section className="container-editorial py-12 md:py-16">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="space-y-8">
            <div>
              <p className="eyebrow">ატელიე</p>
              <div className="mt-5 space-y-5 text-[12px] leading-relaxed">
                <p className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-earth" aria-hidden /> {settings.address}</p>
                <p className="flex gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-earth" aria-hidden /> ორშ–შაბ · 11:00–19:00<br />კვირას დახურულია</p>
                <a href={`tel:${settings.supportPhone.replace(/\s/g, '')}`} className="flex gap-3 hover:text-ink"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-earth" aria-hidden /> {settings.supportPhone}</a>
                <a href={`mailto:${settings.supportEmail}`} className="flex gap-3 hover:text-ink"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-earth" aria-hidden /> {settings.supportEmail}</a>
              </div>
            </div>
            <div className="border-t border-ink/10 pt-6">
              <p className="eyebrow">სწრაფი პასუხი</p>
              <ul className="mt-4 space-y-3 text-[11px] text-ink/65">
                <li className="flex items-center gap-3"><PackageCheck className="h-4 w-4 text-earth" aria-hidden /> შეკვეთის სტატუსი — პროფილში</li>
                <li className="flex items-center gap-3"><Truck className="h-4 w-4 text-earth" aria-hidden /> მიწოდება — 2–4 სამუშაო დღე</li>
                <li className="flex items-center gap-3"><RotateCcw className="h-4 w-4 text-earth" aria-hidden /> დაბრუნება — 14 დღე</li>
              </ul>
            </div>
            <div className="border-t border-ink/10 pt-6">
              <p className="text-[10px] uppercase tracking-[0.16em] text-ink/65">სოციალური</p>
              <div className="mt-3 flex gap-4 text-[11px]">
                <a href={settings.instagramUrl || 'https://instagram.com'} target="_blank" rel="noreferrer" className="link-underline text-ink/65 hover:text-ink">Instagram</a>
                <a href={settings.facebookUrl || 'https://facebook.com'} target="_blank" rel="noreferrer" className="link-underline text-ink/65 hover:text-ink">Facebook</a>
              </div>
            </div>
          </div>

          <div>
            <p className="eyebrow">მოგვწერეთ</p>
            <h2 className="mt-3 font-display text-3xl font-light tracking-display md:text-4xl">რით შეგვიძლია დაგეხმაროთ?</h2>
            <form onSubmit={submit} className="mt-8 space-y-6" noValidate>
              <div className="grid gap-6 sm:grid-cols-2">
                <Input label="სახელი" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" required />
                <Input label="ელფოსტა" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" required />
              </div>
              <Input label="თემა" value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} placeholder="შეკვეთა, მიწოდება, პროდუქტი…" />
              <Textarea label="შეტყობინება" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} rows={6} required />
              {error && <InlineNotice tone="danger">{error}</InlineNotice>}
              {sent && (
                <InlineNotice tone="success" icon={<Check className="h-4 w-4" aria-hidden />}>
                  ელფოსტის აპლიკაცია გაიხსნა. თუ წერილი არ გაიგზავნა, მოგვწერეთ პირდაპირ {settings.supportEmail}-ზე.
                </InlineNotice>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <Button type="submit" size="lg" rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}>გაგზავნა</Button>
                <p className="text-[9px] leading-relaxed text-ink/65">გაგზავნით ეთანხმებით კონფიდენციალურობის პოლიტიკას.</p>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

export function DeliveryPage() {
  const { settings } = useBackendSnapshot();
  return (
    <>
      <Seo title="მიწოდება და დაბრუნება" description="MAKU — მიწოდების ვადები, ტარიფები და 14-დღიანი დაბრუნების პროცედურა." />
      <InfoHero
        eyebrow="მომსახურება"
        title={<>მიწოდება<br />და დაბრუნება</>}
        description={`თბილისში შეკვეთას ვაწვდით 1–2 სამუშაო დღეში, რეგიონებში — 3–6 დღეში. სტანდარტული მიწოდება უფასოა ${formatMoney(settings.freeShippingThreshold)}-დან.`}
        image="tbilisi-2"
        imageAlt="მიწოდება თბილისში"
      />

      <section className="container-editorial py-12 md:py-16">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="border border-ink/10 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">სტანდარტული</p>
                <h2 className="mt-2 font-display text-3xl">2–4 სამუშაო დღე</h2>
              </div>
              <Truck className="h-5 w-5 text-earth" aria-hidden />
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-ink/65">
              თბილისში 1–2 დღე, რეგიონულ ქალაქებში 3–6 დღე. კურიერი დაგიკავშირდებათ მიტანამდე.
            </p>
            <p className="mt-6 font-display text-2xl">{formatMoney(settings.standardShippingFee)} <span className="font-sans text-[10px] uppercase tracking-[0.12em] text-ink/65">/ უფასო {formatMoney(settings.freeShippingThreshold)}-დან</span></p>
          </div>
          <div className="border border-ink/10 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">ექსპრესი</p>
                <h2 className="mt-2 font-display text-3xl">1 სამუშაო დღე</h2>
              </div>
              <Sparkles className="h-5 w-5 text-earth" aria-hidden />
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-ink/65">
              მხოლოდ თბილისის მასშტაბით. შეკვეთა 14:00-მდე გაფორმების შემთხვევაში მიწოდება ხდება იმავე დღეს.
            </p>
            <p className="mt-6 font-display text-2xl">{formatMoney(settings.expressShippingFee)}</p>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="eyebrow">პროცესი</p>
            <h2 className="store-heading-sm mt-3">როგორ<br />მუშაობს</h2>
            <div className="mt-6 space-y-4">
              <InlineNotice tone="neutral" icon={<ShieldCheck className="h-4 w-4" aria-hidden />}>
                გადახდა ხდება მიღებისას — ნაღდი ან ბარათით. წინასწარ გადახდა არ გჭირდებათ.
              </InlineNotice>
              <InlineNotice tone="neutral" icon={<MapPin className="h-4 w-4" aria-hidden />}>
                მიწოდება ხდება საქართველოს მასშტაბით. საერთაშორისო გზავნილისთვის მოგვწერეთ ინდივიდუალურად.
              </InlineNotice>
            </div>
          </div>
          <NumberedList
            items={[
              { title: 'შეკვეთის დადასტურება', text: 'შეკვეთის გაფორმების შემდეგ ჩვენ დაგიკავშირდებით ტელეფონით ან ელფოსტით, რათა დავადასტუროთ მისამართი და დეტალები.' },
              { title: 'მომზადება და შეფუთვა', text: 'პროდუქტი მოწმდება, იწმინდება და იფუთება ხელით — ქაღალდში, ტილოში და დამცავ ყუთში.' },
              { title: 'კურიერი', text: 'მიტანამდე 30–60 წუთით ადრე მიიღებთ ზარს. თუ ადგილზე არ ხართ, შეკვეთა გადაიდება შემდეგ სამუშაო დღეზე.' },
              { title: 'მიღება და შემოწმება', text: 'გთხოვთ, ადგილზე შეამოწმოთ შეფუთვა და პროდუქტი. ხარვეზის შემთხვევაში დაუყოვნებლივ დაგვიკავშირდით.' },
            ]}
          />
        </div>

        <div className="mt-14 border-t border-ink/10 pt-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <p className="eyebrow">დაბრუნება</p>
              <h2 className="font-display text-4xl font-light tracking-display md:text-5xl">14 დღე,<br />მარტივად</h2>
              <p className="mt-4 text-[12px] leading-relaxed text-ink/65">
                თუ პროდუქტი არ ერგება, შეგიძლიათ დაბრუნოთ ან გაცვალოთ მიღებიდან 14 კალენდარულ დღეში. პროდუქტი უნდა იყოს
                გამოუყენებელი, ორიგინალურ შეფუთვაში და ყველა ეტიკეტით.
              </p>
              <Link to="/contact" className="mt-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-ink/65 underline underline-offset-4 hover:text-ink">
                დაბრუნების დაწყება <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { title: 'ნაბიჯი 1 — შეტყობინება', text: 'მოგვწერეთ შეკვეთის ნომერი და დაბრუნების მიზეზი.' },
                { title: 'ნაბიჯი 2 — დადასტურება', text: '24 საათში მიიღებთ ინსტრუქციას კურიერის ან ატელიეში მოტანის შესახებ.' },
                { title: 'ნაბიჯი 3 — შემოწმება', text: 'პროდუქტის მიღების შემდეგ ვამოწმებთ მდგომარეობას და ვიწყებთ დაბრუნებას.' },
                { title: 'ნაბიჯი 4 — თანხის დაბრუნება', text: 'თანხა ბრუნდება 3–5 სამუშაო დღეში იმავე გზით, როგორც გადახდა მოხდა.' },
              ].map((item) => (
                <div key={item.title} className="border border-ink/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-earth">{item.title}</p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink/65">{item.text}</p>
                </div>
              ))}
              <InlineNotice tone="warning">
                პერსონალიზებული ან ინდივიდუალურად შეკერილი პროდუქტი დაბრუნებას არ ექვემდებარება, გარდა ხარვეზისა.
              </InlineNotice>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function CarePage() {
  const guides = [
    {
      title: 'ტყავის ჩანთა',
      items: [
        'გამოიყენეთ რბილი, მშრალი ტილო ზედაპირის გასაწმენდად.',
        'ტყავის კონდიციონერი — თვეში ერთხელ, მცირე რაოდენობით.',
        'მოარიდეთ პირდაპირ მზეს, სითბოს წყაროს და ტენიანობას.',
        'შენახვისას ჩადეთ ქაღალდი ფორმის შესანარჩუნებლად და დააფარეთ მტვრისგან.',
      ],
    },
    {
      title: 'აბრეშუმის შარფი',
      items: [
        'ხელით რეცხვა ცივ წყალში, ნეიტრალური საპნით.',
        'არ გამოწუროთ — გააშრეთ ბრტყლად, ჩრდილში.',
        'რკინით დაუთოება მხოლოდ დაბალ ტემპერატურაზე, ქსოვილის გავლით.',
        'შეინახეთ ცალკე, ბასრი საგნებისგან მოშორებით.',
      ],
    },
    {
      title: 'სამკაული',
      items: [
        'მოიხსენით ხელები სპორტის, ცურვისა და სახლის დალაგების დროს.',
        'აარიდეთ პარფიუმერს, კრემებსა და ქლორიან წყალს.',
        'გაასუფთავეთ რბილი ტილოთი; ვერცხლისთვის გამოიყენეთ სპეციალური რბილი ტილო.',
        'შეინახეთ ცალკე პატარა ჩანთაში ან ყუთში.',
      ],
    },
  ];
  return (
    <>
      <Seo title="პროდუქტის მოვლა" description="როგორ შევინარჩუნოთ ტყავის, აბრეშუმისა და სამკაულის სილამაზე წლების განმავლობაში." />
      <InfoHero
        eyebrow="მოვლა"
        title={<>დრო<br />მეგობარია</>}
        description="კარგად მოვლილი ტყავი, აბრეშუმი და ვერცხლი დროთა განმავლობაში უფრო ღრმა ხდება. ეს პატარა რიტუალები დაგეხმარებათ, რომ თქვენი ობიექტი თაობებს გაუძლოს."
        image="craft-02"
        imageAlt="ტყავის ხელით დამუშავება"
      />
      <section className="container-editorial py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {guides.map((guide, index) => (
            <div key={guide.title} className="border border-ink/10 p-6">
              <span className="font-display text-3xl text-earth">0{index + 1}</span>
              <h2 className="mt-3 font-display text-2xl">{guide.title}</h2>
              <ul className="mt-4 space-y-3">
                {guide.items.map((item) => (
                  <li key={item} className="flex gap-3 text-[11px] leading-relaxed text-ink/65">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-champagne" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <InlineNotice tone="warning" icon={<ShieldCheck className="h-4 w-4" aria-hidden />}>
            არასოდეს გამოიყენოთ აცეტონი, სპირტი, საღებავი ან მძიმე ქიმიკატები. ეჭვის შემთხვევაში მოგვწერეთ.
          </InlineNotice>
          <InlineNotice tone="neutral" icon={<Sparkles className="h-4 w-4" aria-hidden />}>
            ატელიეში შესაძლებელია პროფესიონალური გაწმენდა და ტყავის აღდგენა — უფასო შეფასებით.
          </InlineNotice>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-ink/10 pt-8 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow">დახმარება</p>
            <p className="mt-2 font-display text-2xl">გაქვთ კითხვა მოვლაზე?</p>
          </div>
          <Link to="/contact" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-[10px] uppercase tracking-[0.16em] text-ivory transition-colors hover:bg-inkhover">
            მოგვწერეთ <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}

const FAQ_GROUPS = [
  {
    title: 'შეკვეთა და გადახდა',
    items: [
      { q: 'როგორ შევუკვეთო?', a: 'აირჩიეთ პროდუქტი, დაამატეთ კალათაში და გაიარეთ 4-საფეხურიანი გაფორმება: კონტაქტი, მიწოდება, გადახდა და დადასტურება. შეკვეთა ინახება თქვენს პროფილში.' },
      { q: 'როგორ ხდება გადახდა?', a: 'ამ ეტაპზე ხელმისაწვდომია მხოლოდ გადახდა მიღებისას (COD) — ნაღდი ან ბარათით კურიერთან.' },
      { q: 'შემიძლია შეკვეთის გაუქმება?', a: 'დიახ, სანამ შეკვეთა გაგზავნილია. დაგვიკავშირდით შეკვეთის ნომრით ან მოგვწერეთ პროფილიდან. გაგზავნის შემდეგ შესაძლებელია დაბრუნება 14 დღეში.' },
      { q: 'პრომოკოდი არ მუშაობს — რატომ?', a: 'შეამოწმეთ ვადა, მინიმალური შეკვეთა და გამოყენების ლიმიტი. პრომოკოდი ითვლება მხოლოდ ერთხელ ერთ მომხმარებელზე, თუ სხვა წესი არ არის მითითებული.' },
    ],
  },
  {
    title: 'მიწოდება',
    items: [
      { q: 'რამდენ ხანში მოვა შეკვეთა?', a: 'თბილისში 1–2 სამუშაო დღე, რეგიონებში 3–6 დღე. ექსპრეს მიწოდება თბილისში — იმავე ან მომდევნო დღეს.' },
      { q: 'რა ღირს მიწოდება?', a: 'სტანდარტული მიწოდება ₾15, უფასოა ₾300-დან. ექსპრესი — ₾30.' },
      { q: 'შემიძლია ატელიეში ავიღო?', a: 'დიახ, აირჩიეთ სტანდარტული მიწოდება და მოგვწერეთ, რომ ატელიეში აპირებთ აღებას. მისამართი: აბაშიძის ქ. 24.' },
    ],
  },
  {
    title: 'პროდუქტი და ზომა',
    items: [
      { q: 'როგორ ავირჩიო ზომა?', a: 'თითოეული პროდუქტის გვერდზე მითითებულია ზომები და ტევადობა. ეჭვის შემთხვევაში მოგვწერეთ — დაგეხმარებით შერჩევაში.' },
      { q: 'პროდუქტი ხელნაკეთია?', a: 'დიახ. ყველა პროდუქტი იწარმოება ატელიეში, ხელით. მცირე განსხვავებები ტონსა და ნაკერში ბუნებრივია და ხელნაკეთობის ნიშანია.' },
      { q: 'შეიძლება ინდივიდუალური შეკვეთა?', a: 'დიახ, გარკვეული მოდელებისთვის შესაძლებელია ფერისა და ზომის არჩევა. მოგვწერეთ სასურველი დეტალები.' },
    ],
  },
  {
    title: 'დაბრუნება და გარანტია',
    items: [
      { q: 'რა არის დაბრუნების ვადა?', a: '14 კალენდარული დღე მიღებიდან. პროდუქტი უნდა იყოს გამოუყენებელი და ორიგინალურ შეფუთვაში.' },
      { q: 'ვინ იხდის დაბრუნების ტრანსპორტირებას?', a: 'ხარვეზის შემთხვევაში — MAKU. სხვა შემთხვევაში დაბრუნების ღირებულებას ფარავს მომხმარებელი.' },
      { q: 'არის გარანტია ნაკერზე?', a: 'დიახ, 2 წლიანი გარანტია ნაკერსა და ფურნიტურაზე. ბუნებრივი ცვეთა არ ითვლება ხარვეზად.' },
    ],
  },
];

export function FaqPage() {
  return (
    <>
      <Seo title="ხშირად დასმული კითხვები" description="პასუხები MAKU-ს შეკვეთაზე, მიწოდებაზე, პროდუქტსა და დაბრუნებაზე." />
      <InfoHero
        eyebrow="დახმარება"
        title={<>ხშირად<br />დასმული</>}
        description="შეკრიბეთ ყველაზე გავრცელებული კითხვები შეკვეთის, მიწოდების, პროდუქტისა და დაბრუნების შესახებ. თუ პასუხი ვერ იპოვეთ, მოგვწერეთ."
        image="editorial-02"
        imageAlt="MAKU-ს პროდუქტის დეტალი"
      />
      <section className="container-editorial py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-16">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">სექციები</p>
            <nav className="mt-4 space-y-2" aria-label="FAQ სექციები">
              {FAQ_GROUPS.map((group) => (
                <a key={group.title} href={`#faq-${group.title}`} className="block text-[11px] text-ink/65 transition-colors hover:text-ink">
                  {group.title}
                </a>
              ))}
            </nav>
            <div className="mt-8 border-t border-ink/10 pt-5">
              <p className="text-[10px] leading-relaxed text-ink/65">ვერ იპოვეთ პასუხი?</p>
              <Link to="/contact" className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-ink underline underline-offset-4">
                მოგვწერეთ <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>
          </aside>
          <div className="space-y-10">
            {FAQ_GROUPS.map((group) => (
              <div key={group.title} id={`faq-${group.title}`}>
                <h2 className="border-b border-ink/10 pb-3 font-display text-2xl">{group.title}</h2>
                <div className="divide-y divide-ink/10">
                  {group.items.map((item) => (
                    <details key={item.q} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[12px] font-medium transition-colors hover:text-ink/65 [&::-webkit-details-marker]:hidden">
                        {item.q}
                        <ChevronDown className="h-4 w-4 shrink-0 text-ink/65 transition-transform duration-300 group-open:rotate-180" aria-hidden />
                      </summary>
                      <p className="pb-5 pr-8 text-[12px] leading-[1.9] text-ink/65">{item.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function LegalPage({
  title,
  eyebrow,
  intro,
  sections,
}: {
  title: string;
  eyebrow: string;
  intro: string;
  sections: Array<{ title: string; body: ReactNode }>;
}) {
  return (
    <>
      <Seo title={title} description={intro} />
      <div className="container-editorial py-10 md:py-14">
        <Link to="/" className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-ink/65 hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> მთავარი
        </Link>
        <div className="mt-8 border-b border-ink/10 pb-8">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl font-light tracking-display md:text-6xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-[12px] leading-relaxed text-ink/65">{intro}</p>
          <p className="mt-3 text-[9px] uppercase tracking-[0.14em] text-ink/65">ძალაშია 30 ოქტომბრიდან, 2026</p>
        </div>
        <div className="grid gap-10 pt-10 lg:grid-cols-[220px_1fr] lg:gap-16">
          <nav className="hidden lg:block" aria-label="სექციები">
            <p className="eyebrow">სარჩევი</p>
            <ol className="mt-4 space-y-2">
              {sections.map((section, index) => (
                <li key={section.title}>
                  <a href={`#legal-${index}`} className="text-[10px] text-ink/65 transition-colors hover:text-ink">
                    {String(index + 1).padStart(2, '0')}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="max-w-3xl space-y-10">
            {sections.map((section, index) => (
              <section key={section.title} id={`legal-${index}`} className="scroll-mt-28">
                <h2 className="font-display text-2xl">{String(index + 1).padStart(2, '0')}. {section.title}</h2>
                <div className="mt-3 space-y-3 text-[12px] leading-[1.9] text-ink/65">{section.body}</div>
              </section>
            ))}
            <div className="border-t border-ink/10 pt-6 text-[10px] leading-relaxed text-ink/65">
              კითხვების შემთხვევაში დაგვიკავშირდით: <a href="mailto:hello@maku.ge" className="underline underline-offset-2">hello@maku.ge</a> · აბაშიძის ქ. 24, თბილისი.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="სამართლებრივი"
      title="კონფიდენციალურობა"
      intro="ჩვენ ვაგროვებთ მხოლოდ იმ მონაცემებს, რომლებიც საჭიროა თქვენი შეკვეთის შესრულების, ანგარიშის მართვისა და მომსახურების გასაუმჯობესებლად. ეს პოლიტიკა განმარტავს, როგორ ვიყენებთ და ვიცავთ მათ."
      sections={[
        { title: 'რა მონაცემებს ვაგროვებთ', body: <><p>სახელი, გვარი, ელფოსტა, ტელეფონი, მისამართი და შეკვეთის ისტორია — რეგისტრაციისა და შეკვეთის შესრულებისთვის. ასევე ტექნიკური ინფორმაცია: ბრაუზერის ტიპი, მოწყობილობა და ვიზიტის დრო.</p><p>ჩვენ არ ვაგროვებთ ბარათის მონაცემებს — გადახდა ხდება მიღებისას, კურიერთან.</p></> },
        { title: 'როგორ ვიყენებთ მონაცემებს', body: <p>შეკვეთის დამუშავება, მიწოდება, მომხმარებელთან კომუნიკაცია, ანგარიშის უსაფრთხოება და სერვისის გაუმჯობესება. მარკეტინგული შეტყობინებები იგზავნება მხოლოდ თქვენი თანხმობით და შეგიძლიათ ნებისმიერ დროს გააუქმოთ.</p> },
        { title: 'მონაცემების გაზიარება', body: <p>მონაცემებს ვუზიარებთ მხოლოდ კურიერის კომპანიას (მიწოდებისთვის) და ტექნიკურ პროვაიდერებს (ჰოსტინგი, ელფოსტა) კონფიდენციალურობის ვალდებულებით. არ ვყიდით მონაცემებს მესამე მხარეს.</p> },
        { title: 'შენახვის ვადა', body: <p>შეკვეთის მონაცემები ინახება ბუღალტრული და სამართლებრივი ვალდებულებების შესაბამისად. ანგარიშის წაშლის მოთხოვნისას ვშლით პერსონალურ მონაცემებს, გარდა კანონით სავალდებულო ჩანაწერებისა.</p> },
        { title: 'თქვენი უფლებები', body: <p>შეგიძლიათ მოითხოვოთ მონაცემებზე წვდომა, კორექტირება, წაშლა ან დამუშავების შეზღუდვა. მოგვწერეთ hello@maku.ge-ზე — ვუპასუხებთ 30 დღის განმავლობაში.</p> },
        { title: 'Cookies და ანალიტიკა', body: <p>ვიყენებთ მხოლოდ აუცილებელ ტექნიკურ მეხსიერებას სესიისა და კალათის შესანახად. ანალიტიკა აგრეგირებულია და არ იდენტიფიცირებს კონკრეტულ პირს.</p> },
      ]}
    />
  );
}

export function TermsPage() {
  return (
    <LegalPage
      eyebrow="სამართლებრივი"
      title="წესები და პირობები"
      intro="ამ წესებით რეგულირდება MAKU-ს ვებგვერდისა და ატელიეს მომსახურება. შეკვეთის გაფორმებით თქვენ ეთანხმებით ქვემოთ მოცემულ პირობებს."
      sections={[
        { title: 'ზოგადი დებულებები', body: <p>მომსახურებას აწვდის MAKU (ინდივიდუალური მეწარმე, თბილისი, საქართველო). ვებგვერდზე განთავსებული ინფორმაცია წარმოადგენს საჯარო შეთავაზებას. ფასები მითითებულია ქართულ ლარში (GEL) და მოიცავს დღგ-ს, თუ მოქმედებს.</p> },
        { title: 'შეკვეთა და დადასტურება', body: <p>შეკვეთა ითვლება მიღებულად მას შემდეგ, რაც სისტემა დაადასტურებს მას. ჩვენ ვიტოვებთ უფლებას, დავაზუსტოთ ხელმისაწვდომობა და საჭიროების შემთხვევაში შევცვალოთ მიწოდების ვადა, წინასწარ შეტყობინებით.</p> },
        { title: 'ფასები და გადახდა', body: <p>გადახდა ხდება მიღებისას (COD). ფასი მოიცავს პროდუქტს, შეფუთვასა და არჩეულ მიწოდებას. პრომოკოდები არ ჯამდება და მოქმედებს მხოლოდ მითითებულ ვადაში.</p> },
        { title: 'მიწოდება', body: <p>მიწოდება ხდება საქართველოს მასშტაბით, პარტნიორი კურიერის მეშვეობით. რისკი პროდუქტზე გადადის მომხმარებელზე მიღების მომენტიდან. მიღებისას გთხოვთ შეამოწმოთ შეფუთვა.</p> },
        { title: 'დაბრუნება და გაცვლა', body: <p>პროდუქტი შეიძლება დაბრუნდეს 14 კალენდარულ დღეში, თუ ის გამოუყენებელია და შენარჩუნებულია ორიგინალური შეფუთვა. ინდივიდუალური შეკვეთა დაბრუნებას არ ექვემდებარება ხარვეზის გარდა.</p> },
        { title: 'ინტელექტუალური საკუთრება', body: <p>ვებგვერდის დიზაინი, ტექსტი, ფოტოები და პროდუქტის ფორმები ეკუთვნის MAKU-ს. გამოყენება დაუშვებელია წერილობითი თანხმობის გარეშე.</p> },
        { title: 'პასუხისმგებლობა', body: <p>ჩვენ ვპასუხობთ პროდუქტის ხარისხზე და შეკვეთის შესრულებაზე. არ ვპასუხობთ ფორსმაჟორულ გარემოებებზე, მომხმარებლის მიერ არასწორი მონაცემების მიწოდებაზე ან ბუნებრივ ცვეთაზე.</p> },
      ]}
    />
  );
}

export function NotFoundPage() {
  return (
    <>
      <Seo title="გვერდი ვერ მოიძებნა" noIndex />
      <div className="container-editorial flex min-h-[65dvh] flex-col items-center justify-center py-20 text-center">
        <p className="eyebrow">შეცდომა 404</p>
        <h1 className="mt-4 font-display text-7xl font-light tracking-display md:text-9xl">404</h1>
        <p className="mt-4 max-w-md text-[12px] leading-relaxed text-ink/65">
          გვერდი, რომელსაც ეძებთ, აღარ არსებობს ან მისამართი შეიცვალა. დაბრუნდით მთავარ გვერდზე ან გადადით კოლექციაში.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-[10px] uppercase tracking-[0.16em] text-ivory transition-colors hover:bg-inkhover">
            მთავარი
          </Link>
          <Link to="/catalog" className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/20 px-6 text-[10px] uppercase tracking-[0.16em] text-ink transition-colors hover:border-ink">
            კოლექცია <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </>
  );
}
