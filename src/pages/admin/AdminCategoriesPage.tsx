import { useMemo, useState } from 'react';
import { Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { useBackendSnapshot, useCurrentUser } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { errorMessage } from '@/lib/errors';
import { categorySchema, fieldErrors } from '@/lib/validation';
import type { Category, CategoryDraft } from '@/lib/types';
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
  AdminTextarea,
} from '@/components/admin/AdminUI';

function emptyDraft(): CategoryDraft {
  return {
    name: '',
    nameEn: '',
    slug: '',
    description: '',
    image: '',
    order: 0,
    active: true,
  };
}

function formFromCategory(category: Category): CategoryDraft {
  return {
    name: category.name,
    nameEn: category.nameEn,
    slug: category.slug,
    description: category.description,
    image: category.image,
    order: category.order,
    active: category.active,
    parentId: category.parentId,
  };
}

export function AdminCategoriesPage() {
  const snapshot = useBackendSnapshot();
  const user = useCurrentUser();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [form, setForm] = useState<CategoryDraft>(emptyDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  const rootCategories = useMemo(
    () => snapshot.categories.filter((entry) => !entry.parentId),
    [snapshot.categories],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return snapshot.categories.filter((entry) => {
      if (filter === 'active' && !entry.active) return false;
      if (filter === 'inactive' && entry.active) return false;
      if (!query) return true;
      const haystack = `${entry.name} ${entry.nameEn} ${entry.slug} ${entry.description}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [snapshot.categories, search, filter]);

  const totalCount = snapshot.categories.length;
  const activeCount = snapshot.categories.filter((entry) => entry.active).length;
  const inactiveCount = totalCount - activeCount;

  const openNew = () => {
    setForm(emptyDraft());
    setErrors({});
    setEditing('new');
  };

  const openEdit = (category: Category) => {
    setForm(formFromCategory(category));
    setErrors({});
    setEditing(category);
  };

  const parentOptions = useMemo(
    () =>
      rootCategories.map((entry) => ({
        label: entry.name,
        value: entry.id,
      })),
    [rootCategories],
  );

  const save = async () => {
    const draft: CategoryDraft = {
      ...form,
      parentId: form.parentId || undefined,
    };
    const parsed = categorySchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const currentId = editing && editing !== 'new' ? editing.id : undefined;
    const current = currentId ? snapshot.categories.find((entry) => entry.id === currentId) : undefined;
    if (current?.parentId && !draft.parentId) {
      setErrors({ parentId: 'A subcategory requires a parent category.' });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await backend.saveCategory(draft);
      toast(editing === 'new' ? 'Category created' : 'Category updated', { message: draft.name });
      setEditing(null);
    } catch (error) {
      toast('Could not save', { message: errorMessage(error), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (category: Category) => {
    try {
      await backend.saveCategory({ ...category, active: !category.active });
      toast(category.active ? 'Category disabled' : 'Category enabled', { message: category.name });
    } catch (error) {
      toast('Could not change', { message: errorMessage(error), variant: 'error' });
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await backend.deleteCategory(deleting.id);
      toast('Category deleted', { message: deleting.name, variant: 'info' });
      setDeleting(null);
    } catch (error) {
      toast('Could not delete', { message: errorMessage(error), variant: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const productCount = (categoryId: string) =>
    snapshot.products.filter((product) => product.categoryId === categoryId || product.subcategoryId === categoryId).length;

  const statusBadge = (active: boolean) => (
    <span
      className={
        active
          ? 'rounded border border-[#4d7a60]/35 bg-[#4d7a60]/12 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-[#3f6b53]'
          : 'rounded border border-[var(--line)] bg-[var(--surface-hover)] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-[var(--text-secondary)]'
      }
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Categories"
        description="Manage store categories and subcategories. Disabled categories are hidden in the storefront."
        actions={
          isAdmin && (
            <AdminButton size="sm" leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden />} onClick={openNew}>
              New category
            </AdminButton>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStat label="Total" value={totalCount} sub="categories" icon={<Tag className="h-4 w-4" aria-hidden />} />
        <AdminStat label="Active" value={activeCount} sub="visible in storefront" icon={<Tag className="h-4 w-4" aria-hidden />} accent="success" />
        <AdminStat label="Disabled" value={inactiveCount} sub="hidden in storefront" icon={<Tag className="h-4 w-4" aria-hidden />} accent="warning" />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3 sm:flex-row sm:items-center">
        <AdminSearch value={search} onChange={setSearch} placeholder="Search by name, slug or description…" className="sm:w-72" />
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
          {(['all', 'active', 'inactive'] as const).map((entry) => (
            <AdminChip key={entry} active={filter === entry} onClick={() => setFilter(entry)}>
              {entry === 'all' ? 'All' : entry === 'active' ? 'Active' : 'Inactive'}
            </AdminChip>
          ))}
        </div>
      </div>

      {!visible.length ? (
        <AdminEmpty title="No categories found" description="Change the filter." action={isAdmin ? <AdminButton size="sm" onClick={openNew}>New category</AdminButton> : undefined} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((category) => {
            const children = snapshot.categories.filter((entry) => entry.parentId === category.id);
            const count = productCount(category.id);
            return (
              <AdminPanel key={category.id} className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-semibold tracking-[0.08em] text-[var(--tone-accent-text)]">
                        {category.slug}
                      </span>
                      {statusBadge(category.active)}
                    </div>
                    <p className="mt-2 font-medium text-[11px] leading-relaxed text-[var(--text-primary)]">{category.name}</p>
                    {category.nameEn && <p className="mt-0.5 text-[9px] text-[var(--text-secondary)]">{category.nameEn}</p>}
                    {category.description && (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">{category.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-[9px] text-[var(--text-secondary)]">
                      <span>{count} product{count !== 1 ? 's' : ''}</span>
                      {children.length > 0 && <span>· {children.length} subcategory{children.length !== 1 ? 'ies' : ''}</span>}
                    </div>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c6aa82]/25 bg-[#c6aa82]/[0.06] text-[11px] font-medium text-[var(--tone-accent-text)]">
                    {category.order}
                  </span>
                </div>

                {children.length > 0 && (
                  <div className="mt-3 border-t border-[var(--line)] pt-3">
                    <p className="mb-2 text-[9px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">Subcategories</p>
                    <div className="space-y-1.5">
                      {children.map((child) => (
                        <div key={child.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-[var(--surface-hover)]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate text-[10px] text-[var(--text-primary)]">{child.name}</span>
                            {statusBadge(child.active)}
                          </div>
                          <div className="flex items-center gap-1">
                            {isAdmin && (
                              <>
                                <AdminButton
                                  size="icon"
                                  variant="ghost"
                                  aria-label={child.active ? 'Disable category' : 'Enable category'}
                                  onClick={() => void toggle(child)}
                                >
                                  {child.active ? <X className="h-3 w-3" aria-hidden /> : <Tag className="h-3 w-3" aria-hidden />}
                                </AdminButton>
                                <AdminButton size="icon" variant="ghost" aria-label="Edit category" onClick={() => openEdit(child)}>
                                  <Pencil className="h-3 w-3" aria-hidden />
                                </AdminButton>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <AdminButton size="sm" variant="secondary" leftIcon={<Pencil className="h-3 w-3" aria-hidden />} onClick={() => openEdit(category)}>
                      Edit
                    </AdminButton>
                    <AdminButton size="sm" variant="ghost" onClick={() => void toggle(category)}>
                      {category.active ? 'Disable' : 'Enable'}
                    </AdminButton>
                    <AdminButton size="icon" variant="ghost" aria-label="Delete category" onClick={() => setDeleting(category)}>
                      <Trash2 className="h-3 w-3 text-[var(--tone-danger-text)]" aria-hidden />
                    </AdminButton>
                  </div>
                )}
              </AdminPanel>
            );
          })}
        </div>
      )}

      <AdminModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New category' : `Edit category — ${editing ? editing.name : ''}`}
        description="The slug is used in URLs. The image is an asset key."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </AdminButton>
            <AdminButton loading={saving} onClick={() => void save()}>
              Save
            </AdminButton>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminInput label="Name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} error={errors.name} placeholder="e.g. Bags" />
          <AdminInput label="Name (en)" required value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} error={errors.nameEn} placeholder="e.g. Bags" />
          <AdminInput label="Slug" required value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/\s+/g, '-') })} error={errors.slug} placeholder="e.g. bags" hint="Used in URLs." />
          <AdminField label="Description" error={errors.description} className="sm:col-span-2">
            <AdminTextarea aria-label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} maxLength={300} placeholder="Category description" />
          </AdminField>
          <AdminInput label="Image asset key" required value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} error={errors.image} placeholder="e.g. bag-generic-01" hint="Editorial image asset key." />
          <AdminInput label="Order" type="number" min={0} value={String(form.order)} onChange={(event) => setForm({ ...form, order: Math.max(0, Number(event.target.value) || 0) })} error={errors.order} hint="Display order." />
          <AdminSelect label="Parent category" value={form.parentId ?? ''} onChange={(event) => setForm({ ...form, parentId: event.target.value || undefined })}>
            <option value="">None (top-level)</option>
            {parentOptions.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </AdminSelect>
          <label className="flex items-center gap-3 rounded-lg border border-[var(--line)] p-3 sm:col-span-2">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4 accent-[#c6aa82]" />
            <span>
              <span className="block text-[11px] text-[var(--text-primary)]">Category is active</span>
              <span className="mt-0.5 block text-[9px] text-[var(--text-secondary)]">Disabled categories are hidden in the storefront.</span>
            </span>
          </label>
        </div>
      </AdminModal>

      <AdminModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete category"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setDeleting(null)} disabled={deleteLoading}>
              Cancel
            </AdminButton>
            <AdminButton variant="danger" loading={deleteLoading} onClick={() => void remove()}>
              Delete
            </AdminButton>
          </div>
        }
      >
        <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
          Delete category <span className="font-mono text-[var(--text-primary)]">{deleting?.name}</span>? This cannot be undone.
        </p>
      </AdminModal>
    </div>
  );
}
