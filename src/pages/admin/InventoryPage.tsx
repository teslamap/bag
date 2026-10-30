import { useMemo, useState } from 'react';
import { AlertTriangle, Archive, Boxes, Download, PackageCheck, Pencil, SearchX, TrendingDown } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { errorMessage } from '@/lib/errors';
import {
  AdminButton,
  AdminChip,
  AdminEmpty,
  AdminField,
  AdminInput,
  AdminModal,
  AdminPageHeader,
  AdminPanel,
  AdminSearch,
  AdminSelect,
  AdminStat,
  MoneyText,
  TableWrap,
} from '@/components/admin/AdminUI';
import { SafeImage } from '@/components/ui/SafeImage';
import { downloadCsv, formatMoney, getProductStock, getVariantLabel } from '@/lib/utils';
import type { Product, ProductVariant } from '@/lib/types';

type StockFilter = 'all' | 'low' | 'out' | 'healthy';

interface StockRow {
  product: Product;
  variant: ProductVariant;
  label: string;
}

export function AdminInventoryPage({ basePath = '/admin', canManage = true }: { basePath?: string; canManage?: boolean }) {
  const snapshot = useBackendSnapshot();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [category, setCategory] = useState('all');
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);
  const [newStock, setNewStock] = useState('0');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const rows = useMemo<StockRow[]>(() => {
    return snapshot.products.flatMap((product) =>
      product.variants.map((variant) => ({ product, variant, label: getVariantLabel(product, variant) })),
    );
  }, [snapshot.products]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(({ product, variant, label }) => {
      if (category !== 'all' && product.categoryId !== category) return false;
      if (filter === 'low' && !(variant.stock > 0 && variant.stock <= product.lowStockThreshold)) return false;
      if (filter === 'out' && variant.stock > 0) return false;
      if (filter === 'healthy' && variant.stock <= product.lowStockThreshold) return false;
      if (!query) return true;
      return product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query) || variant.sku.toLowerCase().includes(query) || label.toLowerCase().includes(query);
    });
  }, [rows, search, filter, category]);

  const activeProducts = snapshot.products.filter((product) => product.status === 'active');
  const totalUnits = activeProducts.reduce((total, product) => total + getProductStock(product), 0);
  const lowCount = rows.filter((row) => row.product.status === 'active' && row.variant.stock > 0 && row.variant.stock <= row.product.lowStockThreshold).length;
  const outCount = rows.filter((row) => row.product.status === 'active' && row.variant.stock === 0).length;
  const stockValue = activeProducts.reduce(
    (total, product) => total + product.variants.reduce((subtotal, variant) => subtotal + variant.stock * (product.price + variant.priceDelta), 0),
    0,
  );
  const categories = snapshot.categories.filter((entry) => !entry.parentId);

  const openAdjust = (row: StockRow) => {
    setAdjusting(row);
    setNewStock(String(row.variant.stock));
    setReason('');
    setError('');
  };

  const saveAdjustment = async () => {
    if (!adjusting) return;
    if (!reason.trim()) {
      setError('მიუთითეთ ცვლილების მიზეზი.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await backend.adjustStock(adjusting.product.id, adjusting.variant.id, Math.max(0, Number(newStock) || 0), reason.trim());
      toast('მარაგი განახლდა', { message: `${adjusting.product.name} · ${adjusting.variant.sku}: ${adjusting.variant.stock} → ${Math.max(0, Number(newStock) || 0)}` });
      setAdjusting(null);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      'maku-inventory.csv',
      ['პროდუქტი', 'SKU', 'ვარიანტი', 'ვარიანტის SKU', 'მარაგი', 'ზღვარი', 'ფასი (₾)', 'სტატუსი'],
      filtered.map(({ product, variant, label }) => [
        product.name,
        product.sku,
        label,
        variant.sku,
        variant.stock,
        product.lowStockThreshold,
        ((product.price + variant.priceDelta) / 100).toFixed(2),
        variant.stock === 0 ? 'ამოწურული' : variant.stock <= product.lowStockThreshold ? 'დაბალი' : 'ნორმა',
      ]),
    );
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="ოპერაციები"
        title="მარაგის კონტროლი"
        description={`${rows.length} ვარიანტი · მარაგის ცვლილება აისახება აუდიტის ჟურნალში და დაბალი მარაგის გაფრთხილებებში.`}
        actions={<AdminButton variant="secondary" size="sm" leftIcon={<Download className="h-3.5 w-3.5" aria-hidden />} onClick={exportCsv}>CSV</AdminButton>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="ერთეულები" value={totalUnits} sub={`${activeProducts.length} აქტიური პროდუქტი`} icon={<Boxes className="h-4 w-4" aria-hidden />} />
        <AdminStat label="დაბალი მარაგი" value={lowCount} sub="ვარიანტი ზღვარზე" icon={<TrendingDown className="h-4 w-4" aria-hidden />} accent="warning" />
        <AdminStat label="ამოწურული" value={outCount} sub="ვარიანტი მარაგის გარეშე" icon={<AlertTriangle className="h-4 w-4" aria-hidden />} accent="danger" />
        <AdminStat label="მარაგის ღირებულება" value={formatMoney(stockValue)} sub="გასაყიდი ფასებით" icon={<PackageCheck className="h-4 w-4" aria-hidden />} accent="success" />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3 lg:flex-row lg:items-center">
        <AdminSearch value={search} onChange={setSearch} placeholder="პროდუქტი, SKU, ვარიანტი…" className="lg:w-72" />
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
          <AdminChip active={filter === 'all'} onClick={() => setFilter('all')} count={rows.length}>ყველა</AdminChip>
          <AdminChip active={filter === 'low'} onClick={() => setFilter('low')} count={lowCount}>დაბალი</AdminChip>
          <AdminChip active={filter === 'out'} onClick={() => setFilter('out')} count={outCount}>ამოწურული</AdminChip>
          <AdminChip active={filter === 'healthy'} onClick={() => setFilter('healthy')}>ნორმა</AdminChip>
        </div>
        <div className="flex flex-1 justify-end">
          <AdminSelect value={category} onChange={(event) => setCategory(event.target.value)} className="h-8 w-auto min-w-36 py-0 text-[10px]" aria-label="კატეგორია">
            <option value="all">ყველა კატეგორია</option>
            {categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </AdminSelect>
        </div>
      </div>

      <AdminPanel noPadding>
        <div className="hidden lg:block">
          <TableWrap>
            <table className="admin-table w-full min-w-[820px]">
              <thead><tr><th>პროდუქტი</th><th>ვარიანტი</th><th>SKU</th><th>მარაგი</th><th>ზღვარი</th><th>ფასი</th><th>სტატუსი</th><th /></tr></thead>
              <tbody>
                {filtered.map(({ product, variant, label }) => (
                  <tr key={`${product.id}-${variant.id}`}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-7 shrink-0 overflow-hidden bg-[var(--surface-hover)]">
                          <SafeImage source={product.images[0]?.source ?? ''} alt={product.name} width={96} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium">{product.name}</p>
                          <p className="mt-0.5 font-mono text-[8px] text-[var(--text-secondary)]">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-40 truncate text-[10px] text-[var(--text-secondary)]">{label || '—'}</td>
                    <td className="font-mono text-[9px] text-[var(--text-secondary)]">{variant.sku}</td>
                    <td className="text-[12px] font-medium tabular-nums">{variant.stock}</td>
                    <td className="text-[10px] tabular-nums text-[var(--text-secondary)]">{product.lowStockThreshold}</td>
                    <td><MoneyText value={product.price + variant.priceDelta} /></td>
                    <td>
                      {variant.stock === 0 ? (
                        <span className="rounded border border-[#a04a4a]/35 bg-[#a04a4a]/10 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em] text-[var(--tone-danger-text)]">ამოწურული</span>
                      ) : variant.stock <= product.lowStockThreshold ? (
                        <span className="rounded border border-[#b88a43]/35 bg-[#b88a43]/10 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em] text-[var(--tone-warning-text)]">დაბალი</span>
                      ) : (
                        <span className="rounded border border-[#4d7a60]/35 bg-[#4d7a60]/12 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em] text-[var(--tone-success-text)]">ნორმა</span>
                      )}
                    </td>
                    <td>
                      {canManage && <AdminButton size="sm" variant="secondary" leftIcon={<Pencil className="h-3 w-3" aria-hidden />} onClick={() => openAdjust({ product, variant, label })}>მარაგი</AdminButton>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>

        <ul className="divide-y divide-[var(--line)] lg:hidden">
          {filtered.map(({ product, variant, label }) => (
            <li key={`${product.id}-${variant.id}`} className="px-4 py-3.5">
              <div className="flex items-start gap-3">
                <div className="h-11 w-9 shrink-0 overflow-hidden bg-[var(--surface-hover)]">
                  <SafeImage source={product.images[0]?.source ?? ''} alt={product.name} width={120} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[11px] font-medium">{product.name}</p>
                    <span className={`shrink-0 text-[11px] font-medium tabular-nums ${variant.stock === 0 ? 'text-[var(--tone-danger-text)]' : variant.stock <= product.lowStockThreshold ? 'text-[var(--tone-warning-text)]' : 'text-[var(--tone-success-text)]'}`}>{variant.stock}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[9px] text-[var(--text-secondary)]">{label || 'ერთი ვარიანტი'} · {variant.sku}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[9px] text-[var(--text-secondary)]">ზღვარი {product.lowStockThreshold} · {formatMoney(product.price + variant.priceDelta)}</span>
                    {canManage && <AdminButton size="sm" variant="secondary" onClick={() => openAdjust({ product, variant, label })}>მარაგი</AdminButton>}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {!filtered.length && (
          <AdminEmpty
            title="მარაგის ჩანაწერები ვერ მოიძებნა"
            icon={<SearchX className="h-4 w-4" aria-hidden />}
            action={<AdminButton size="sm" variant="secondary" onClick={() => { setSearch(''); setFilter('all'); setCategory('all'); }}>ფილტრების გასუფთავება</AdminButton>}
          />
        )}
      </AdminPanel>

      <AdminModal
        open={Boolean(adjusting)}
        onClose={() => setAdjusting(null)}
        title="მარაგის კორექცია"
        description={adjusting ? `${adjusting.product.name} · ${adjusting.variant.sku}` : undefined}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setAdjusting(null)} disabled={saving}>გაუქმება</AdminButton>
            <AdminButton loading={saving} onClick={() => void saveAdjustment()}>შენახვა</AdminButton>
          </div>
        }
      >
        {adjusting && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-hover)]/60 px-3 py-2.5 text-[10px]">
              <span className="text-[var(--text-secondary)]">მიმდინარე მარაგი</span>
              <span className="text-[14px] font-medium tabular-nums">{adjusting.variant.stock}</span>
            </div>
            <AdminInput
              label="ახალი მარაგი"
              type="number"
              min={0}
              step={1}
              value={newStock}
              onChange={(event) => setNewStock(event.target.value)}
              error={error && !reason.trim() ? error : undefined}
            />
            <AdminField label="ცვლილების მიზეზი" required error={error && reason.trim() ? error : undefined}>
              <textarea
                aria-label="ცვლილების მიზეზი"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
                maxLength={300}
                className="admin-input resize-y"
                placeholder="მაგ. ახალი მიწოდება ატელიედან / დაზიანებული ერთეულის ჩამოწერა…"
              />
            </AdminField>
            <p className="flex items-start gap-2 text-[9px] leading-relaxed text-[var(--text-secondary)]">
              <Archive className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              კორექცია დაფიქსირდება აუდიტის ჟურნალში. მარაგი არ შეიძლება იყოს უარყოფითი.
            </p>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
