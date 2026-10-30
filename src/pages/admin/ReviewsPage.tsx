import { useMemo, useState } from 'react';
import { Check, MessageSquare, SearchX, Star, X } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { errorMessage } from '@/lib/errors';
import {
  AdminButton,
  AdminChip,
  AdminEmpty,
  AdminModal,
  AdminPageHeader,
  AdminPanel,
  AdminSearch,
  AdminSelect,
  AdminStat,
} from '@/components/admin/AdminUI';
import { Rating } from '@/components/ui/Rating';
import { formatDateTime, truncate } from '@/lib/utils';
import type { Review, ReviewStatus } from '@/lib/types';

const STATUS_LABELS: Record<ReviewStatus, string> = { pending: 'მოლოდინში', approved: 'დამტკიცებული', rejected: 'უარყოფილი' };

export function AdminReviewsPage({ canManage = true }: { canManage?: boolean }) {
  const snapshot = useBackendSnapshot();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ReviewStatus>('pending');
  const [rating, setRating] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [selected, setSelected] = useState<Review | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return snapshot.reviews.filter((review) => {
      if (status !== 'all' && review.status !== status) return false;
      if (rating !== 'all' && review.rating !== Number(rating)) return false;
      if (!query) return true;
      return review.author.toLowerCase().includes(query) || review.productName.toLowerCase().includes(query) || review.title.toLowerCase().includes(query) || review.body.toLowerCase().includes(query);
    });
  }, [snapshot.reviews, search, status, rating]);

  const moderate = async (review: Review, next: 'approved' | 'rejected') => {
    setWorking(review.id);
    try {
      await backend.moderateReview(review.id, next);
      toast(next === 'approved' ? 'მიმოხილვა გამოქვეყნდა' : 'მიმოხილვა უარყოფილ იქნა', { message: review.productName });
      setSelected(null);
    } catch (error) {
      toast('ვერ შესრულდა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setWorking(null);
    }
  };

  const pending = snapshot.reviews.filter((review) => review.status === 'pending').length;
  const approved = snapshot.reviews.filter((review) => review.status === 'approved');
  const average = approved.length ? Math.round((approved.reduce((total, review) => total + review.rating, 0) / approved.length) * 10) / 10 : 0;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="სოციალური მტკიცებულება"
        title="მიმოხილვები"
        description="მხოლოდ შეძენილი პროდუქტის მიმოხილვა მიიღება. დამტკიცებული შეფასებები აისახება პროდუქტის რეიტინგში."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStat label="მოლოდინში" value={pending} sub="საჭიროებს მოდერაციას" icon={<MessageSquare className="h-4 w-4" aria-hidden />} accent={pending ? 'warning' : 'success'} />
        <AdminStat label="საშუალო რეიტინგი" value={average ? average.toFixed(1) : '—'} sub={`${approved.length} გამოქვეყნებული`} icon={<Star className="h-4 w-4" aria-hidden />} accent="success" />
        <AdminStat label="სულ შეფასება" value={snapshot.reviews.length} sub={`${snapshot.reviews.filter((review) => review.verifiedPurchase).length} დადასტურებული შეძენა`} icon={<Check className="h-4 w-4" aria-hidden />} />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3 lg:flex-row lg:items-center">
        <AdminSearch value={search} onChange={setSearch} placeholder="ავტორი, პროდუქტი, ტექსტი…" className="lg:w-72" />
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((entry) => (
            <AdminChip
              key={entry}
              active={status === entry}
              onClick={() => setStatus(entry)}
              count={entry === 'all' ? snapshot.reviews.length : snapshot.reviews.filter((review) => review.status === entry).length}
            >
              {entry === 'all' ? 'ყველა' : STATUS_LABELS[entry]}
            </AdminChip>
          ))}
        </div>
        <div className="flex flex-1 justify-end">
          <AdminSelect value={rating} onChange={(event) => setRating(event.target.value as typeof rating)} className="h-8 w-auto min-w-28 py-0 text-[10px]" aria-label="რეიტინგი">
            <option value="all">ყველა რეიტინგი</option>
            {[5, 4, 3, 2, 1].map((value) => <option key={value} value={String(value)}>{value} ★</option>)}
          </AdminSelect>
        </div>
      </div>

      {!filtered.length ? (
        <AdminEmpty
          title="მიმოხილვები ვერ მოიძებნა"
          description={status === 'pending' ? 'მოდერაციას ელოდება ყველაფერი დამუშავებულია.' : 'შეცვალეთ ფილტრი ან ძიების სიტყვა.'}
          icon={<SearchX className="h-4 w-4" aria-hidden />}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((review) => (
            <AdminPanel key={review.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Rating value={review.rating} size="sm" />
                    <span
                      className={
                        review.status === 'approved'
                          ? 'rounded border border-[#4d7a60]/35 bg-[#4d7a60]/12 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em] text-[var(--tone-success-text)]'
                          : review.status === 'rejected'
                            ? 'rounded border border-[#a04a4a]/35 bg-[#a04a4a]/12 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em] text-[var(--tone-danger-text)]'
                            : 'rounded border border-[#b88a43]/35 bg-[#b88a43]/10 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em] text-[var(--tone-warning-text)]'
                      }
                    >
                      {STATUS_LABELS[review.status]}
                    </span>
                    {review.verifiedPurchase && <span className="text-[8px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">✓ შეძენილი</span>}
                  </div>
                  <button type="button" onClick={() => setSelected(review)} className="mt-2 block text-left">
                    <p className="text-[12px] font-medium text-[var(--text-primary)]">{review.title}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">{truncate(review.body, 170)}</p>
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-3 text-[9px] text-[var(--text-secondary)]">
                <span className="min-w-0 truncate">{review.author} · {review.productName}</span>
                <span className="shrink-0">{formatDateTime(review.createdAt)}</span>
              </div>
              {canManage && review.status === 'pending' && (
                <div className="mt-3 flex gap-1.5">
                  <AdminButton size="sm" variant="success" loading={working === review.id} leftIcon={<Check className="h-3 w-3" aria-hidden />} onClick={() => void moderate(review, 'approved')}>დამტკიცება</AdminButton>
                  <AdminButton size="sm" variant="danger" loading={working === review.id} leftIcon={<X className="h-3 w-3" aria-hidden />} onClick={() => void moderate(review, 'rejected')}>უარყოფა</AdminButton>
                  <AdminButton size="sm" variant="ghost" onClick={() => setSelected(review)}>სრულად</AdminButton>
                </div>
              )}
              {review.status !== 'pending' && (
                <button type="button" onClick={() => setSelected(review)} className="mt-3 self-start text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">სრულად ნახვა</button>
              )}
            </AdminPanel>
          ))}
        </div>
      )}

      <AdminModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="მიმოხილვის დეტალები"
        description={selected ? `${selected.author} · ${selected.productName}` : undefined}
        size="md"
        footer={
          selected && canManage && selected.status === 'pending' ? (
            <div className="flex justify-end gap-2">
              <AdminButton variant="danger" loading={working === selected.id} onClick={() => void moderate(selected, 'rejected')}>უარყოფა</AdminButton>
              <AdminButton variant="success" loading={working === selected.id} onClick={() => void moderate(selected, 'approved')}>დამტკიცება</AdminButton>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Rating value={selected.rating} size="md" />
              <span className="text-[9px] text-[var(--text-secondary)]">{formatDateTime(selected.createdAt)}</span>
              {selected.verifiedPurchase && <span className="rounded border border-[#4d7a60]/35 bg-[#4d7a60]/12 px-1.5 py-0.5 text-[8px] text-[var(--tone-success-text)]">დადასტურებული შეძენა</span>}
            </div>
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-hover)]/50 p-4">
              <p className="text-[13px] font-medium text-[var(--text-primary)]">{selected.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--text-secondary)]">{selected.body}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-lg border border-[var(--line)] p-2.5"><dt className="text-[8px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">პროდუქტი</dt><dd className="mt-1 text-[var(--text-primary)]">{selected.productName}</dd></div>
              <div className="rounded-lg border border-[var(--line)] p-2.5"><dt className="text-[8px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">სტატუსი</dt><dd className="mt-1 text-[var(--text-primary)]">{STATUS_LABELS[selected.status]}</dd></div>
              {selected.moderatedAt && <div className="rounded-lg border border-[var(--line)] p-2.5 col-span-2"><dt className="text-[8px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">მოდერაცია</dt><dd className="mt-1 text-[var(--text-primary)]">{formatDateTime(selected.moderatedAt)}</dd></div>}
            </dl>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
