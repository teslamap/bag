import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Eye,
  GripVertical,
  ImagePlus,
  Link2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { errorMessage } from '@/lib/errors';
import { AdminButton, AdminCheckbox, AdminEmpty, AdminField, AdminInput, AdminModal, AdminPageHeader, AdminPanel, AdminSelect, AdminTextarea } from '@/components/admin/AdminUI';
import { SafeImage } from '@/components/ui/SafeImage';
import { productSchema, fieldErrors } from '@/lib/validation';
import { moneyToInput, parseMoneyInput, formatMoney, makeId, getProductStock } from '@/lib/utils';
import type { Product, ProductDraft, ProductImage, ProductOption, ProductStatus, ProductVariant } from '@/lib/types';

interface EditorState {
  name: string;
  subtitle: string;
  description: string;
  story: string;
  categoryId: string;
  subcategoryId: string;
  sku: string;
  lowStockThreshold: number;
  status: ProductStatus;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
  materials: string;
  dimensions: string;
  care: string;
  tagsText: string;
  featured: boolean;
  bestseller: boolean;
  isNew: boolean;
}

function optionSignature(options: ProductOption[], variant: ProductVariant): string {
  return options.map((option) => variant.options[option.name] ?? '').join('::');
}

function combinations(options: ProductOption[]): Array<Record<string, string>> {
  const active = options.filter((option) => option.name.trim() && option.values.length);
  if (!active.length) return [{}];
  return active.reduce<Array<Record<string, string>>>((acc, option) => {
    const next: Array<Record<string, string>> = [];
    for (const combination of acc) {
      for (const value of option.values) {
        next.push({ ...combination, [option.name]: value.value });
      }
    }
    return next;
  }, [{}]);
}

function defaultsFor(product: Product | undefined, categories: ReturnType<typeof useBackendSnapshot>['categories']): EditorState {
  if (product) {
    return {
      name: product.name,
      subtitle: product.subtitle,
      description: product.description,
      story: product.story,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId,
      sku: product.sku,
      lowStockThreshold: product.lowStockThreshold,
      status: product.status,
      images: product.images,
      options: product.options,
      variants: product.variants,
      materials: product.materials,
      dimensions: product.dimensions,
      care: product.care,
      tagsText: product.tags.join(', '),
      featured: product.featured,
      bestseller: product.bestseller,
      isNew: product.isNew,
    };
  }
  const mainCategory = categories.find((entry) => !entry.parentId && entry.active) ?? categories.find((entry) => !entry.parentId);
  const subcategory = categories.find((entry) => entry.parentId === mainCategory?.id);
  return {
    name: '',
    subtitle: '',
    description: '',
    story: '',
    categoryId: mainCategory?.id ?? '',
    subcategoryId: subcategory?.id ?? '',
    sku: `MK-${makeId('sku').replace('sku_', '').slice(0, 8).toUpperCase()}`,
    lowStockThreshold: 3,
    status: 'draft',
    images: [],
    options: [{ name: 'ფერი', values: [{ value: 'natural', label: 'ნატურალური', swatch: '#D6C19C' }] }],
    variants: [{ id: makeId('var'), sku: `MK-${makeId('v').replace('v_', '').slice(0, 6).toUpperCase()}`, options: { 'ფერი': 'natural' }, stock: 0, priceDelta: 0 }],
    materials: '',
    dimensions: '',
    care: '',
    tagsText: '',
    featured: false,
    bestseller: false,
    isNew: true,
  };
}

export function AdminProductEditorPage({ basePath = '/admin' }: { basePath?: string }) {
  const { id } = useParams();
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const existing = id ? snapshot.products.find((product) => product.id === id) : undefined;
  const isNew = !id;
  const [form, setForm] = useState<EditorState>(() => defaultsFor(existing, snapshot.categories));
  const [priceInput, setPriceInput] = useState(existing ? moneyToInput(existing.price) : '');
  const [compareInput, setCompareInput] = useState(existing?.compareAtPrice ? moneyToInput(existing.compareAtPrice) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlAlt, setUrlAlt] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(defaultsFor(existing, snapshot.categories));
    setPriceInput(existing ? moneyToInput(existing.price) : '');
    setCompareInput(existing?.compareAtPrice ? moneyToInput(existing.compareAtPrice) : '');
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const categories = snapshot.categories.filter((entry) => !entry.parentId);
  const subcategories = snapshot.categories.filter((entry) => entry.parentId === form.categoryId);
  const update = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const totalStock = useMemo(() => form.variants.reduce((total, variant) => total + Math.max(0, variant.stock), 0), [form.variants]);

  if (id && !existing) {
    return (
      <div className="space-y-5">
        <AdminPageHeader title="პროდუქტი ვერ მოიძებნა" eyebrow="კატალოგი" />
        <AdminEmpty title="ჩანაწერი არ არსებობს" description="პროდუქტი შესაძლოა წაშლილი იყოს." action={<AdminButton size="sm" onClick={() => navigate(`${basePath}/products`)}>პროდუქტებში დაბრუნება</AdminButton>} />
      </div>
    );
  }

  const setCategory = (categoryId: string) => {
    const nextSub = snapshot.categories.find((entry) => entry.parentId === categoryId)?.id ?? '';
    setForm((current) => ({ ...current, categoryId, subcategoryId: nextSub }));
    setDirty(true);
  };

  const generateVariants = () => {
    const combos = combinations(form.options);
    const previous = new Map(form.variants.map((variant) => [optionSignature(form.options, variant), variant]));
    const variants = combos.map((options, index) => {
      const signature = form.options.map((option) => options[option.name] ?? '').join('::');
      const found = previous.get(signature);
      return found
        ? { ...found, options }
        : {
            id: makeId('var'),
            sku: `${form.sku || 'MK'}-${String(index + 1).padStart(2, '0')}`,
            options,
            stock: 0,
            priceDelta: 0,
          };
    });
    update('variants', variants);
    toast('ვარიანტები გენერირდა', { message: `${variants.length} კომბინაცია.`, variant: 'info' });
  };

  const addOption = () => {
    update('options', [...form.options, { name: `ოფცია ${form.options.length + 1}`, values: [] }]);
  };

  const updateOptionName = (index: number, name: string) => {
    const oldName = form.options[index].name;
    const options = form.options.map((option, optionIndex) => optionIndex === index ? { ...option, name } : option);
    const variants = form.variants.map((variant) => {
      const next = { ...variant.options };
      if (oldName in next) {
        next[name] = next[oldName];
        delete next[oldName];
      }
      return { ...variant, options: next };
    });
    setForm((current) => ({ ...current, options, variants }));
    setDirty(true);
  };

  const addOptionValue = (index: number) => {
    const option = form.options[index];
    const options = form.options.map((entry, entryIndex) => entryIndex === index ? {
      ...entry,
      values: [...entry.values, { value: `value-${entry.values.length + 1}`, label: 'ახალი მნიშვნელობა', swatch: '#C6AA82' }],
    } : entry);
    update('options', options);
  };

  const updateOptionValue = (optionIndex: number, valueIndex: number, patch: Partial<ProductOption['values'][number]>) => {
    const options = form.options.map((option, index) => index === optionIndex ? {
      ...option,
      values: option.values.map((value, currentIndex) => currentIndex === valueIndex ? { ...value, ...patch } : value),
    } : option);
    update('options', options);
  };

  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    const options = form.options.map((option, index) => index === optionIndex ? { ...option, values: option.values.filter((_, currentIndex) => currentIndex !== valueIndex) } : option);
    update('options', options);
  };

  const removeOption = (index: number) => {
    const removed = form.options[index].name;
    const options = form.options.filter((_, optionIndex) => optionIndex !== index);
    const variants = form.variants.map((variant) => {
      const next = { ...variant.options };
      delete next[removed];
      return { ...variant, options: next };
    });
    setForm((current) => ({ ...current, options, variants }));
    setDirty(true);
  };

  const updateVariant = (index: number, patch: Partial<ProductVariant>) => {
    update('variants', form.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, ...patch } : variant));
  };

  const addImage = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: ProductImage[] = [];
      for (const file of Array.from(files)) {
        const source = await backend.uploadImage(file);
        uploaded.push({ id: makeId('img'), source, alt: file.name.replace(/\.[^.]+$/, '') });
      }
      update('images', [...form.images, ...uploaded]);
      toast('სურათი დაემატა', { message: `${uploaded.length} ფოტო.` });
    } catch (error) {
      toast('ატვირთვა ვერ მოხერხდა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addUrlImage = () => {
    if (!/^https?:\/\/.+/i.test(urlValue.trim())) {
      toast('ბმული არასწორია', { message: 'შეიყვანეთ სრული https:// ბმული.', variant: 'error' });
      return;
    }
    update('images', [...form.images, { id: makeId('img'), source: urlValue.trim(), alt: urlAlt.trim() || form.name || 'პროდუქტის ფოტო' }]);
    setUrlOpen(false);
    setUrlValue('');
    setUrlAlt('');
  };

  const reorderImage = (from: number, to: number) => {
    if (to < 0 || to >= form.images.length) return;
    const images = [...form.images];
    const [moved] = images.splice(from, 1);
    images.splice(to, 0, moved);
    update('images', images);
  };

  const removeImage = (imageId: string) => update('images', form.images.filter((image) => image.id !== imageId));

  const validate = () => {
    const result = productSchema.safeParse({
      name: form.name,
      subtitle: form.subtitle,
      description: form.description,
      story: form.story,
      categoryId: form.categoryId,
      subcategoryId: form.subcategoryId,
      price: parseMoneyInput(priceInput),
      compareAtPrice: compareInput ? parseMoneyInput(compareInput) : undefined,
      sku: form.sku,
      lowStockThreshold: form.lowStockThreshold,
      status: form.status,
      materials: form.materials,
      dimensions: form.dimensions,
      care: form.care,
    });
    const nextErrors: Record<string, string> = {};
    if (!result.success) Object.assign(nextErrors, fieldErrors(result.error));
    if (!form.variants.length) nextErrors.variants = 'დაამატეთ მინიმუმ ერთი ვარიანტი.';
    if (form.status === 'active' && !form.images.length) nextErrors.images = 'აქტიურ პროდუქტს სჭირდება მინიმუმ ერთი ფოტო.';
    const skuSet = new Set<string>();
    for (const variant of form.variants) {
      if (!variant.sku.trim()) nextErrors.variants = 'ყველა ვარიანტს სჭირდება SKU.';
      if (skuSet.has(variant.sku.toUpperCase())) nextErrors.variants = 'ვარიანტების SKU ერთმანეთს მეორდება.';
      skuSet.add(variant.sku.toUpperCase());
      if (!Number.isInteger(variant.stock) || variant.stock < 0) nextErrors.variants = 'მარაგი უნდა იყოს დადებითი მთელი რიცხვი.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const save = async () => {
    setFormError('');
    if (!validate()) {
      setFormError('შეამოწმეთ მონიშნული ველები.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaving(true);
    try {
      const draft: ProductDraft = {
        id: existing?.id,
        name: form.name.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        story: form.story.trim(),
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId,
        price: parseMoneyInput(priceInput),
        compareAtPrice: compareInput ? parseMoneyInput(compareInput) : undefined,
        sku: form.sku.trim(),
        lowStockThreshold: form.lowStockThreshold,
        status: form.status,
        images: form.images,
        options: form.options.map((option) => ({ ...option, name: option.name.trim(), values: option.values.filter((value) => value.label.trim()) })),
        variants: form.variants.map((variant) => ({ ...variant, sku: variant.sku.trim().toUpperCase() })),
        materials: form.materials,
        dimensions: form.dimensions,
        care: form.care,
        tags: form.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean),
        featured: form.featured,
        bestseller: form.bestseller,
        isNew: form.isNew,
      };
      const saved = await backend.saveProduct(draft);
      toast(isNew ? 'პროდუქტი შეიქმნა' : 'პროდუქტი განახლდა', { message: `${saved.name} · ${formatMoney(saved.price)}` });
      setDirty(false);
      navigate(`${basePath}/products`);
    } catch (error) {
      setFormError(errorMessage(error));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async () => {
    if (!existing) return;
    setDeleting(true);
    try {
      await backend.deleteProducts([existing.id]);
      toast('პროდუქტი წაიშალა', { variant: 'info' });
      navigate(`${basePath}/products`);
    } catch (error) {
      toast('ვერ წაიშალა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={`${basePath}/products`} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> პროდუქტები
        </Link>
        <div className="flex items-center gap-2">
          {existing && <Link to={`/product/${existing.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><Eye className="h-3 w-3" aria-hidden /> მაღაზიაში</Link>}
          {dirty && <span className="text-[9px] uppercase tracking-[0.1em] text-[var(--tone-warning-text)]">შენახვის გარეშე</span>}
        </div>
      </div>

      <AdminPageHeader
        eyebrow={isNew ? 'კატალოგი · ახალი' : `კატალოგი · ${existing?.sku}`}
        title={isNew ? 'ახალი პროდუქტი' : form.name || 'პროდუქტის რედაქტორი'}
        description={isNew ? 'შექმენით პროდუქტი, დაამატეთ ფოტოები და ვარიანტები. გამოქვეყნებამდე შეგიძლიათ შეინახოთ დრაფტად.' : `ბოლო განახლება ${new Date(existing?.updatedAt ?? '').toLocaleDateString('ka-GE')} · ${form.variants.length} ვარიანტი · ${totalStock} ერთეული`}
        actions={
          <>
            {existing && <AdminButton variant="danger" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden />} onClick={() => setDeleteOpen(true)}>წაშლა</AdminButton>}
            <AdminButton size="sm" loading={saving} leftIcon={<Save className="h-3.5 w-3.5" aria-hidden />} onClick={() => void save()}>შენახვა</AdminButton>
          </>
        }
      />

      {formError && (
        <div className="flex items-start gap-2 rounded-lg border border-[#a04a4a]/35 bg-[#a04a4a]/10 px-3 py-2.5 text-[11px] text-[var(--tone-danger-text)]" role="alert">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {formError}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <AdminPanel title="ძირითადი ინფორმაცია" eyebrow="შინაარსი">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput label="სახელი" required value={form.name} onChange={(event) => update('name', event.target.value)} error={errors.name} placeholder="მაგ. Noa" />
              <AdminInput label="ქვესათაური" value={form.subtitle} onChange={(event) => update('subtitle', event.target.value)} error={errors.subtitle} placeholder="მოკლე აღწერა ბარათისთვის" />
              <AdminSelect label="კატეგორია" required value={form.categoryId} onChange={(event) => setCategory(event.target.value)} error={errors.categoryId}>
                <option value="">აირჩიეთ</option>
                {categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </AdminSelect>
              <AdminSelect label="ქვეკატეგორია" required value={form.subcategoryId} onChange={(event) => update('subcategoryId', event.target.value)} error={errors.subcategoryId}>
                <option value="">აირჩიეთ</option>
                {subcategories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </AdminSelect>
              <div className="sm:col-span-2">
                <AdminTextarea label="აღწერა" required rows={4} value={form.description} onChange={(event) => update('description', event.target.value)} error={errors.description} hint="მინიმუმ 20 სიმბოლო" />
              </div>
              <div className="sm:col-span-2">
                <AdminTextarea label="ატელიეს ისტორია" rows={3} value={form.story} onChange={(event) => update('story', event.target.value)} error={errors.story} hint="ნაჩვენებია პროდუქტის გვერდზე" />
              </div>
              <AdminInput label="ბაზისური SKU" required value={form.sku} onChange={(event) => update('sku', event.target.value.toUpperCase())} error={errors.sku} />
              <AdminInput label="ტეგები" value={form.tagsText} onChange={(event) => update('tagsText', event.target.value)} error={errors.tags} hint="გამოყავით მძიმით" placeholder="ტყავი, ჩანთა, ახალი" />
            </div>
          </AdminPanel>

          <AdminPanel title="ფასი და მარაგი" eyebrow="კომერცია">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AdminInput label="ფასი (₾)" required inputMode="decimal" value={priceInput} onChange={(event) => { setPriceInput(event.target.value); setDirty(true); }} error={errors.price} placeholder="0.00" />
              <AdminInput label="ძველი ფასი (₾)" inputMode="decimal" value={compareInput} onChange={(event) => { setCompareInput(event.target.value); setDirty(true); }} error={errors.compareAtPrice} placeholder="არასავალდებულო" />
              <AdminInput label="დაბალი მარაგის ზღვარი" type="number" min={0} value={form.lowStockThreshold} onChange={(event) => update('lowStockThreshold', Math.max(0, Number(event.target.value)))} error={errors.lowStockThreshold} />
              <AdminSelect label="სტატუსი" value={form.status} onChange={(event) => update('status', event.target.value as ProductStatus)} error={errors.status}>
                <option value="draft">დრაფტი</option>
                <option value="active">აქტიური</option>
                <option value="archived">არქივი</option>
              </AdminSelect>
              <div className="flex items-end pb-1">
                <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-hover)] px-3 py-2">
                  <p className="text-[8px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">ჯამური მარაგი</p>
                  <p className="mt-0.5 text-[13px] tabular-nums text-[var(--text-primary)]">{totalStock} ერთეული</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-3">
              <AdminCheckbox label="გამორჩეული" description="მთავარ გვერდზე" checked={form.featured} onChange={(checked) => update('featured', checked)} />
              <AdminCheckbox label="ბესტსელერი" description="კატალოგის ბლოკი" checked={form.bestseller} onChange={(checked) => update('bestseller', checked)} />
              <AdminCheckbox label="ახალი" description="ახალი კოლექცია" checked={form.isNew} onChange={(checked) => update('isNew', checked)} />
            </div>
          </AdminPanel>

          <AdminPanel
            title="ფოტოები"
            eyebrow="მედია"
            description="გადაათრიეთ ფოტოები რიგის შესაცვლელად. პირველი ფოტო არის მთავარი."
            action={
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void addImage(event.target.files)} />
                <AdminButton size="sm" variant="secondary" leftIcon={<Upload className="h-3.5 w-3.5" aria-hidden />} loading={uploading} onClick={() => fileRef.current?.click()}>ატვირთვა</AdminButton>
                <AdminButton size="sm" variant="secondary" leftIcon={<Link2 className="h-3.5 w-3.5" aria-hidden />} onClick={() => setUrlOpen(true)}>ბმული</AdminButton>
              </div>
            }
          >
            {errors.images && <p className="mb-3 text-[10px] text-[var(--tone-danger-text)]">{errors.images}</p>}
            {form.images.length === 0 ? (
              <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--line-strong)] px-6 py-10 text-[var(--text-secondary)] transition-colors hover:border-[#c6aa82]/50 hover:text-[var(--text-primary)]">
                <ImagePlus className="h-6 w-6" aria-hidden />
                <span className="text-[11px]">ატვირთეთ პირველი ფოტო</span>
                <span className="text-[9px]">JPG, PNG ან WebP · მაქს. 8MB</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {form.images.map((image, index) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => { if (dragIndex !== null && dragIndex !== index) reorderImage(dragIndex, index); setDragIndex(null); }}
                    className={`group relative overflow-hidden rounded-lg border bg-[var(--surface-hover)] ${dragIndex === index ? 'border-[#c6aa82] opacity-60' : 'border-[var(--line)]'}`}
                  >
                    <SafeImage source={image.source} alt={image.alt || form.name} wrapperClassName="aspect-[4/5]" width={480} />
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent p-1.5">
                      <span className="flex h-5 w-5 cursor-grab items-center justify-center rounded bg-black/30 text-white/70" title="გადათრევა"><GripVertical className="h-3 w-3" aria-hidden /></span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => reorderImage(index, index - 1)} disabled={index === 0} className="flex h-5 w-5 items-center justify-center rounded bg-black/30 text-white/70 disabled:opacity-25" aria-label="მარცხნივ"><ArrowLeft className="h-3 w-3" aria-hidden /></button>
                        <button type="button" onClick={() => reorderImage(index, index + 1)} disabled={index === form.images.length - 1} className="flex h-5 w-5 items-center justify-center rounded bg-black/30 text-white/70 disabled:opacity-25" aria-label="მარჯვნივ"><ArrowRight className="h-3 w-3" aria-hidden /></button>
                        <button type="button" onClick={() => removeImage(image.id)} className="flex h-5 w-5 items-center justify-center rounded bg-black/30 text-white/70 hover:text-[#ffb4b4]" aria-label="წაშლა"><X className="h-3 w-3" aria-hidden /></button>
                      </div>
                    </div>
                    <div className="p-2">
                      <input value={image.alt} onChange={(event) => update('images', form.images.map((entry) => entry.id === image.id ? { ...entry, alt: event.target.value } : entry))} placeholder="alt ტექსტი" aria-label={`${index + 1}-ლი ფოტოს აღწერა`} className="admin-input h-7 px-2 text-[9px]" />
                      {index === 0 && <span className="mt-1 block text-[8px] uppercase tracking-[0.1em] text-[var(--tone-accent-text)]">მთავარი ფოტო</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title="ოფციები და ვარიანტები"
            eyebrow="ვარიაციები"
            action={<div className="flex gap-2"><AdminButton size="sm" variant="secondary" leftIcon={<Plus className="h-3 w-3" aria-hidden />} onClick={addOption}>ოფცია</AdminButton><AdminButton size="sm" variant="accent" leftIcon={<Sparkles className="h-3 w-3" aria-hidden />} onClick={generateVariants}>გენერაცია</AdminButton></div>}
          >
            {errors.variants && <p className="mb-3 text-[10px] text-[var(--tone-danger-text)]">{errors.variants}</p>}
            <div className="space-y-3">
              {form.options.map((option, optionIndex) => (
                <div key={optionIndex} className="rounded-lg border border-[var(--line)] p-3">
                  <div className="flex items-center gap-2">
                    <input value={option.name} onChange={(event) => updateOptionName(optionIndex, event.target.value)} placeholder="ოფციის სახელი (მაგ. ფერი)" aria-label="ოფციის სახელი" className="admin-input h-8 flex-1 text-[11px]" />
                    <button type="button" onClick={() => removeOption(optionIndex)} className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--tone-danger-text)]" aria-label="ოფციის წაშლა"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {option.values.map((value, valueIndex) => (
                      <div key={valueIndex} className="flex items-center gap-2">
                        <input type="color" value={value.swatch ?? '#C6AA82'} onChange={(event) => updateOptionValue(optionIndex, valueIndex, { swatch: event.target.value })} aria-label="ფერი" className="h-7 w-7 shrink-0 cursor-pointer rounded border border-[var(--line)] bg-transparent p-0.5" />
                        <input value={value.label} onChange={(event) => updateOptionValue(optionIndex, valueIndex, { label: event.target.value })} placeholder="მნიშვნელობა" aria-label="მნიშვნელობა" className="admin-input h-7 flex-1 px-2 text-[10px]" />
                        <input value={value.value} onChange={(event) => updateOptionValue(optionIndex, valueIndex, { value: event.target.value })} placeholder="key" aria-label="მნიშვნელობის key" className="admin-input h-7 w-24 px-2 font-mono text-[9px]" />
                        <button type="button" onClick={() => removeOptionValue(optionIndex, valueIndex)} className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--tone-danger-text)]" aria-label="მნიშვნელობის წაშლა"><X className="h-3 w-3" aria-hidden /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOptionValue(optionIndex)} className="text-[9px] uppercase tracking-[0.1em] text-[var(--tone-accent-text)] hover:text-[var(--tone-accent-text)]">+ მნიშვნელობის დამატება</button>
                  </div>
                </div>
              ))}
              {!form.options.length && <p className="text-[10px] text-[var(--text-secondary)]">ოფციები არ არის — პროდუქტს ექნება ერთი ვარიანტი.</p>}
            </div>

            <div className="mt-4 overflow-x-auto border-t border-[var(--line)] pt-4">
              <table className="admin-table w-full min-w-[580px]">
                <thead><tr><th>ვარიანტი</th><th>SKU</th><th>მარაგი</th><th>ფასის სხვაობა (₾)</th><th /></tr></thead>
                <tbody>
                  {form.variants.map((variant, index) => (
                    <tr key={variant.id}>
                      <td>
                        <span className="text-[10px] text-[var(--text-primary)]">
                          {form.options.map((option) => option.values.find((value) => value.value === variant.options[option.name])?.label ?? variant.options[option.name]).filter(Boolean).join(' · ') || 'სტანდარტული'}
                        </span>
                      </td>
                      <td><input value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value.toUpperCase() })} aria-label="SKU" className="admin-input h-7 w-32 px-2 text-[10px]" /></td>
                      <td><input type="number" min={0} value={variant.stock} onChange={(event) => updateVariant(index, { stock: Math.max(0, Math.floor(Number(event.target.value))) })} aria-label="მარაგი" className="admin-input h-7 w-20 px-2 text-[10px]" /></td>
                      <td><input type="number" step="0.01" value={variant.priceDelta / 100} onChange={(event) => updateVariant(index, { priceDelta: Math.round(Number(event.target.value) * 100) })} aria-label="ფასის სხვაობა" className="admin-input h-7 w-24 px-2 text-[10px]" /></td>
                      <td><button type="button" onClick={() => update('variants', form.variants.filter((_, variantIndex) => variantIndex !== index))} className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--tone-danger-text)]" aria-label="ვარიანტის წაშლა"><Trash2 className="h-3 w-3" aria-hidden /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!form.variants.length && <p className="py-4 text-center text-[10px] text-[var(--text-secondary)]">ვარიანტები არ არის. დაამატეთ ოფცია და დააჭირეთ გენერაციას.</p>}
            </div>
          </AdminPanel>

          <AdminPanel title="მასალები და ზომები" eyebrow="დეტალები">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminTextarea label="მასალები" rows={2} value={form.materials} onChange={(event) => update('materials', event.target.value)} error={errors.materials} />
              <AdminTextarea label="ზომები" rows={2} value={form.dimensions} onChange={(event) => update('dimensions', event.target.value)} error={errors.dimensions} />
              <div className="sm:col-span-2"><AdminTextarea label="მოვლის ინსტრუქცია" rows={3} value={form.care} onChange={(event) => update('care', event.target.value)} error={errors.care} /></div>
            </div>
          </AdminPanel>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <AdminPanel title="გადახედვა" eyebrow="ბარათი">
            {form.images[0] ? (
              <SafeImage source={form.images[0].source} alt={form.images[0].alt || form.name} wrapperClassName="aspect-[3/4] rounded-lg bg-[var(--surface-hover)]" width={480} />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-[var(--line-strong)] text-[10px] text-[var(--text-secondary)]">ფოტო არ არის</div>
            )}
            <div className="mt-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-xl text-[var(--text-primary)]">{form.name || 'უსახელო პროდუქტი'}</p>
                  <p className="mt-0.5 truncate text-[10px] text-[var(--text-secondary)]">{form.subtitle || 'ქვესათაური'}</p>
                </div>
                <span className="shrink-0 text-[12px] tabular-nums text-[var(--text-primary)]">{priceInput ? formatMoney(parseMoneyInput(priceInput)) : '—'}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3 text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                <span>{form.status === 'active' ? 'აქტიური' : form.status === 'draft' ? 'დრაფტი' : 'არქივი'}</span>
                <span>{form.variants.length} ვარიანტი · {totalStock} მარაგი</span>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="შენახვის შემოწმება">
            <ul className="space-y-2.5 text-[10px]">
              {[
                { ok: Boolean(form.name.trim()), label: 'სახელი' },
                { ok: form.description.trim().length >= 20, label: 'აღწერა (20+)' },
                { ok: Boolean(form.categoryId && form.subcategoryId), label: 'კატეგორია' },
                { ok: form.images.length > 0, label: 'მინიმუმ ერთი ფოტო' },
                { ok: form.variants.length > 0, label: 'მინიმუმ ერთი ვარიანტი' },
                { ok: parseMoneyInput(priceInput) > 0, label: 'დადებითი ფასი' },
              ].map((check) => (
                <li key={check.label} className="flex items-center gap-2">
                  <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] ${check.ok ? 'bg-[#4d7a60]/20 text-[var(--tone-success-text)]' : 'bg-[#a04a4a]/15 text-[var(--tone-danger-text)]'}`}>{check.ok ? '✓' : '·'}</span>
                  <span className={check.ok ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>{check.label}</span>
                </li>
              ))}
            </ul>
          </AdminPanel>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-4">
            <p className="text-[9px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">რჩევა</p>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">
              პირველი ფოტო გამოჩნდება კატალოგში. გამოიყენეთ ვერტიკალური, ნეიტრალურ ფონზე გადაღებული სურათები. ვარიანტების SKU უნდა იყოს უნიკალური მთელ კატალოგში.
            </p>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-16 z-20 flex items-center justify-between gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-elevated)]/95 px-4 py-3 shadow-2xl backdrop-blur md:bottom-4">
        <p className="hidden text-[10px] text-[var(--text-secondary)] sm:block">{dirty ? 'გაქვთ შეუნახავი ცვლილებები.' : 'ყველა ცვლილება შენახულია.'}</p>
        <div className="ml-auto flex gap-2">
          <AdminButton variant="secondary" size="sm" onClick={() => navigate(`${basePath}/products`)}>გაუქმება</AdminButton>
          <AdminButton size="sm" loading={saving} leftIcon={<Save className="h-3.5 w-3.5" aria-hidden />} onClick={() => void save()}>შენახვა</AdminButton>
        </div>
      </div>

      <AdminModal open={urlOpen} onClose={() => setUrlOpen(false)} title="ფოტოს ბმული" size="sm" footer={<div className="flex justify-end gap-2"><AdminButton variant="secondary" onClick={() => setUrlOpen(false)}>გაუქმება</AdminButton><AdminButton onClick={addUrlImage}>დამატება</AdminButton></div>}>
        <div className="space-y-3">
          <AdminInput label="URL" value={urlValue} onChange={(event) => setUrlValue(event.target.value)} placeholder="https://…" />
          <AdminInput label="alt ტექსტი" value={urlAlt} onChange={(event) => setUrlAlt(event.target.value)} placeholder="პროდუქტის ფოტო" />
        </div>
      </AdminModal>

      <AdminModal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="პროდუქტის წაშლა" size="sm" footer={<div className="flex justify-end gap-2"><AdminButton variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>გაუქმება</AdminButton><AdminButton variant="danger" loading={deleting} onClick={() => void removeProduct()}>წაშლა</AdminButton></div>}>
        <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">ნამდვილად გსურთ „{existing?.name}“-ის წაშლა? მოქმედება შეუქცევადია და წაიშლება მიმოხილვებიც.</p>
      </AdminModal>
    </div>
  );
}
