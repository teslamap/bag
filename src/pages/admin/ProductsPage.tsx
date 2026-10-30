import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, ExternalLink, MoreHorizontal, Package, Pencil, Plus, SearchX, Trash2 } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { errorMessage } from '@/lib/errors';
import { AdminButton, AdminChip, AdminEmpty, AdminModal, AdminPageHeader, AdminPanel, AdminSearch, AdminSelect, Pagination, ProductStatusPill, TableWrap } from '@/components/admin/AdminUI';
import { SafeImage } from '@/components/ui/SafeImage';
import { formatDate, formatMoney, getProductStock, downloadCsv } from '@/lib/utils';
import type { ProductStatus } from '@/lib/types';

type Sort = 'updated' | 'name' | 'price-desc' | 'price-asc' | 'stock-asc';

export function AdminProductsPage({ basePath = '/admin', canManage = true }: { basePath?: string; canManage?: boolean }) {
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ProductStatus>('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<Sort>('updated');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 12;

  const categories = snapshot.categories.filter((entry) => !entry.parentId);
  const categoryName = (id: string) => snapshot.categories.find((entry) => entry.id === id)?.name ?? '—';

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = snapshot.products.filter((product) => {
      if (status !== 'all' && product.status !== status) return false;
      if (category !== 'all' && product.categoryId !== category) return false;
      if (!query) return true;
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.subtitle.toLowerCase().includes(query) ||
        product.variants.some((variant) => variant.sku.toLowerCase().includes(query))
      );
    });
    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'name': return a.name.localeCompare(b.name);
        case 'price-desc': return b.price - a.price;
        case 'price-asc': return a.price - b.price;
        case 'stock-asc': return getProductStock(a) - getProductStock(b);
        default: return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    return result;
  }, [snapshot.products, search, status, category, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allVisibleSelected = visible.length > 0 && visible.every((product) => selected.includes(product.id));

  const toggleAll = () => {
    if (allVisibleSelected) setSelected((current) => current.filter((id) => !visible.some((product) => product.id === id)));
    else setSelected((current) => [...new Set([...current, ...visible.map((product) => product.id)])]);
  };

  const changeStatus = async (ids: string[], next: ProductStatus) => {
    try {
      await backend.setProductsStatus(ids, next);
      toast('სტატუსი განახლდა', { message: `${ids.length} პროდუქტი — ${next === 'active' ? 'აქტიური' : next === 'draft' ? 'დრაფტი' : 'არქივი'}.` });
      setSelected([]);
    } catch (error) {
      toast('ვერ განახლდა', { message: errorMessage(error), variant: 'error' });
    }
  };

  const deleteSelected = async () => {
    setDeleting(true);
    try {
      await backend.deleteProducts(selected);
      toast('პროდუქტები წაიშალა', { message: `${selected.length} ჩანაწერი.`, variant: 'info' });
      setSelected([]);
      setDeleteOpen(false);
    } catch (error) {
      toast('ვერ წაიშალა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      'maku-products.csv',
      ['ID', 'სახელი', 'SKU', 'კატეგორია', 'ფასი (₾)', 'მარაგი', 'სტატუსი', 'განახლდა'],
      filtered.map((product) => [product.id, product.name, product.sku, categoryName(product.categoryId), (product.price / 100).toFixed(2), getProductStock(product), product.status, product.updatedAt]),
    );
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="კატალოგი"
        title="პროდუქტები"
        description={`${snapshot.products.length} პროდუქტი · ${snapshot.products.filter((product) => product.status === 'active').length} აქტიური`}
        actions={
          <>
            <AdminButton variant="secondary" size="sm" leftIcon={<Download className="h-3.5 w-3.5" aria-hidden />} onClick={exportCsv}>CSV</AdminButton>
            {canManage && <AdminButton size="sm" leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden />} onClick={() => navigate(`${basePath}/products/new`)}>ახალი პროდუქტი</AdminButton>}
          </>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <AdminSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="ძიება სახელით, SKU-ით…" className="sm:w-72" />
          <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
            {[
              { value: 'all', label: 'ყველა' },
              { value: 'active', label: 'აქტიური' },
              { value: 'draft', label: 'დრაფტი' },
              { value: 'archived', label: 'არქივი' },
            ].map((entry) => (
              <AdminChip key={entry.value} active={status === entry.value} onClick={() => { setStatus(entry.value as typeof status); setPage(1); }} count={entry.value === 'all' ? snapshot.products.length : snapshot.products.filter((product) => product.status === entry.value).length}>
                {entry.label}
              </AdminChip>
            ))}
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <AdminSelect value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="h-8 w-auto min-w-32 py-0 text-[10px]" aria-label="კატეგორია">
              <option value="all">ყველა კატეგორია</option>
              {categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </AdminSelect>
            <AdminSelect value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="h-8 w-auto min-w-32 py-0 text-[10px]" aria-label="სორტირება">
              <option value="updated">ბოლო განახლება</option>
              <option value="name">სახელი</option>
              <option value="price-desc">ფასი ↓</option>
              <option value="price-asc">ფასი ↑</option>
              <option value="stock-asc">მარაგი ↑</option>
            </AdminSelect>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#c6aa82]/25 bg-[#c6aa82]/[0.06] px-3 py-2">
            <span className="text-[10px] text-[var(--tone-accent-text)]">არჩეულია {selected.length}</span>
            <span className="h-3 w-px bg-[var(--line-strong)]" aria-hidden />
            <AdminButton size="sm" variant="success" onClick={() => void changeStatus(selected, 'active')}>გააქტიურება</AdminButton>
            <AdminButton size="sm" variant="secondary" onClick={() => void changeStatus(selected, 'draft')}>დრაფტი</AdminButton>
            <AdminButton size="sm" variant="secondary" onClick={() => void changeStatus(selected, 'archived')}>არქივი</AdminButton>
            <AdminButton size="sm" variant="danger" leftIcon={<Trash2 className="h-3 w-3" aria-hidden />} onClick={() => setDeleteOpen(true)}>წაშლა</AdminButton>
            <button type="button" onClick={() => setSelected([])} className="ml-auto text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">გაუქმება</button>
          </div>
        )}

        <TableWrap className="hidden md:block">
          <table className="admin-table w-full min-w-[760px]">
            <thead>
              <tr>
                <th className="w-8"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="ყველას არჩევა" className="h-3.5 w-3.5 accent-[#c6aa82]" /></th>
                <th>პროდუქტი</th>
                <th>კატეგორია</th>
                <th>ფასი</th>
                <th>მარაგი</th>
                <th>სტატუსი</th>
                <th>განახლდა</th>
                <th className="w-20 text-right">მოქმედება</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((product) => (
                <tr key={product.id} className={selected.includes(product.id) ? 'bg-[#c6aa82]/[0.04]' : undefined}>
                  <td><input type="checkbox" checked={selected.includes(product.id)} onChange={() => setSelected((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])} aria-label={`${product.name}-ის არჩევა`} className="h-3.5 w-3.5 accent-[#c6aa82]" /></td>
                  <td>
                    <Link to={`${basePath}/products/${product.id}/edit`} className="flex items-center gap-3">
                      <SafeImage source={product.images[0]?.source ?? ''} alt={product.name} wrapperClassName="h-11 w-9 shrink-0 rounded bg-[var(--surface-hover)]" width={480} />
                      <span className="min-w-0">
                        <span className="block max-w-48 truncate text-[11px] font-medium text-[var(--text-primary)]">{product.name}</span>
                        <span className="mt-0.5 block text-[9px] text-[var(--text-secondary)]">{product.sku} · {product.variants.length} ვარიანტი</span>
                      </span>
                    </Link>
                  </td>
                  <td className="text-[10px] text-[var(--text-secondary)]">{categoryName(product.categoryId)}</td>
                  <td>
                    <span className="text-[11px] tabular-nums">{formatMoney(product.price)}</span>
                    {product.compareAtPrice && product.compareAtPrice > product.price && <span className="mt-0.5 block text-[9px] text-[var(--text-secondary)] line-through">{formatMoney(product.compareAtPrice)}</span>}
                  </td>
                  <td>
                    <span className={product.stock <= product.lowStockThreshold ? 'text-[11px] tabular-nums text-[var(--tone-danger-text)]' : 'text-[11px] tabular-nums'}>{getProductStock(product)}</span>
                    {product.stock <= product.lowStockThreshold && <span className="mt-0.5 block text-[8px] text-[var(--tone-danger-text)]/70">დაბალი</span>}
                  </td>
                  <td><ProductStatusPill status={product.status} /></td>
                  <td className="text-[9px] text-[var(--text-secondary)]">{formatDate(product.updatedAt)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/product/${product.slug}`} target="_blank" className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]" aria-label="მაღაზიაში ნახვა"><ExternalLink className="h-3.5 w-3.5" aria-hidden /></Link>
                      <Link to={`${basePath}/products/${product.id}/edit`} className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]" aria-label="რედაქტირება"><Pencil className="h-3.5 w-3.5" aria-hidden /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>

        <div className="space-y-2 md:hidden">
          {visible.map((product) => (
            <div key={product.id} className="rounded-lg border border-[var(--line)] p-3">
              <div className="flex gap-3">
                <SafeImage source={product.images[0]?.source ?? ''} alt={product.name} wrapperClassName="h-16 w-12 shrink-0 rounded bg-[var(--surface-hover)]" width={480} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`${basePath}/products/${product.id}/edit`} className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-[var(--text-primary)]">{product.name}</p>
                      <p className="mt-0.5 text-[9px] text-[var(--text-secondary)]">{product.sku} · {categoryName(product.categoryId)}</p>
                    </Link>
                    <ProductStatusPill status={product.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="tabular-nums">{formatMoney(product.price)}</span>
                    <span className={getProductStock(product) <= product.lowStockThreshold ? 'text-[var(--tone-danger-text)]' : 'text-[var(--text-secondary)]'}>მარაგი: {getProductStock(product)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="checkbox" checked={selected.includes(product.id)} onChange={() => setSelected((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])} aria-label={`${product.name}-ის არჩევა`} className="h-3.5 w-3.5 accent-[#c6aa82]" />
                    <Link to={`${basePath}/products/${product.id}/edit`} className="text-[9px] uppercase tracking-[0.1em] text-[var(--tone-accent-text)]">რედაქტირება</Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!visible.length && (
          <AdminEmpty
            icon={<SearchX className="h-4 w-4" aria-hidden />}
            title="პროდუქტი ვერ მოიძებნა"
            description="შეცვალეთ ძიების პარამეტრები ან დაამატეთ ახალი პროდუქტი."
            action={<AdminButton size="sm" leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden />} onClick={() => navigate(`${basePath}/products/new`)}>ახალი პროდუქტი</AdminButton>}
          />
        )}

        <Pagination page={safePage} pageCount={pageCount} onChange={setPage} total={filtered.length} />
      </div>

      <AdminModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="პროდუქტების წაშლა"
        description="მოქმედება შეუქცევადია. პროდუქტთან ერთად წაიშლება მიმოხილვებიც."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>გაუქმება</AdminButton>
            <AdminButton variant="danger" onClick={() => void deleteSelected()} loading={deleting}>წაშლა</AdminButton>
          </div>
        }
      >
        <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">ნამდვილად გსურთ {selected.length} პროდუქტის წაშლა? შეკვეთების ისტორია უცვლელი დარჩება.</p>
      </AdminModal>
    </div>
  );
}
