import { useMemo, useState } from 'react';
import { Download, ScrollText, SearchX, ShieldAlert } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
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
  InlineCode,
  Pagination,
  RangeSelector,
  TableWrap,
} from '@/components/admin/AdminUI';
import { downloadCsv, formatDateTime, timeAgo } from '@/lib/utils';
import type { AuditLog } from '@/lib/types';

const ENTITY_LABELS: Record<AuditLog['entity'], string> = {
  product: 'პროდუქტი',
  order: 'შეკვეთა',
  promotion: 'პრომოკოდი',
  user: 'მომხმარებელი',
  settings: 'პარამეტრები',
  review: 'მიმოხილვა',
  auth: 'ავტორიზაცია',
  category: 'Category',
};

const ACTION_LABELS: Record<string, string> = {
  'order.created': 'შეკვეთა შეიქმნა',
  'order.status_changed': 'შეკვეთის სტატუსი',
  'product.created': 'პროდუქტი შეიქმნა',
  'product.updated': 'პროდუქტი განახლდა',
  'product.deleted': 'პროდუქტი წაიშალა',
  'product.status_changed': 'პროდუქტის სტატუსი',
  'inventory.adjusted': 'მარაგის კორექცია',
  'promotion.created': 'პრომოკოდი შეიქმნა',
  'promotion.updated': 'პრომოკოდი განახლდა',
  'promotion.deleted': 'პრომოკოდი წაიშალა',
  'review.created': 'მიმოხილვა შეიქმნა',
  'review.moderated': 'მიმოხილვა მოდერირებულია',
  'user.created': 'თანამშრომელი შეიქმნა',
  'user.updated': 'თანამშრომელი განახლდა',
  'user.status_updated': 'მომხმარებლის სტატუსი',
  'settings.updated': 'პარამეტრები განახლდა',
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function AdminAuditPage() {
  const snapshot = useBackendSnapshot();
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState<'all' | AuditLog['entity']>('all');
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const pageSize = 20;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const from = range === 'all' ? 0 : Date.now() - (range === '7d' ? 7 : range === '90d' ? 90 : 30) * 86400000;
    return snapshot.auditLogs.filter((entry) => {
      if (entity !== 'all' && entry.entity !== entity) return false;
      if (new Date(entry.createdAt).getTime() < from) return false;
      if (!query) return true;
      return (
        entry.summary.toLowerCase().includes(query) ||
        entry.actorName.toLowerCase().includes(query) ||
        entry.action.toLowerCase().includes(query) ||
        entry.entityId.toLowerCase().includes(query)
      );
    });
  }, [snapshot.auditLogs, search, entity, range]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const actors = new Set(snapshot.auditLogs.map((entry) => entry.actorName)).size;

  const exportCsv = () => {
    downloadCsv(
      'maku-audit.csv',
      ['დრო', 'მოქმედების ავტორი', 'მოქმედება', 'ობიექტი', 'ობიექტის ID', 'აღწერა'],
      filtered.map((entry) => [entry.createdAt, entry.actorName, entry.action, entry.entity, entry.entityId, entry.summary]),
    );
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="უსაფრთხოება"
        title="აუდიტის ჟურნალი"
        description="უცვლელი ოპერაციული ისტორია: ვინ, როდის და რა შეცვალა. ჩანაწერები ხელმისაწვდომია მხოლოდ ადმინისტრატორისთვის."
        actions={<AdminButton variant="secondary" size="sm" leftIcon={<Download className="h-3.5 w-3.5" aria-hidden />} onClick={exportCsv}>CSV</AdminButton>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStat label="ჩანაწერები" value={snapshot.auditLogs.length} sub="ბოლო 2000 ინახება" icon={<ScrollText className="h-4 w-4" aria-hidden />} />
        <AdminStat label="აქტიური ავტორები" value={actors} sub="უნიკალური მოქმედების შემსრულებელი" icon={<ShieldAlert className="h-4 w-4" aria-hidden />} accent="warning" />
        <AdminStat label="ფილტრის შედეგი" value={filtered.length} sub={range === 'all' ? 'მთელი ისტორია' : `ბოლო ${range === '7d' ? '7' : range === '90d' ? '90' : '30'} დღე`} />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3 lg:flex-row lg:items-center">
        <AdminSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="მოქმედება, ავტორი, აღწერა…" className="lg:w-72" />
        <AdminSelect value={entity} onChange={(event) => { setEntity(event.target.value as typeof entity); setPage(1); }} className="h-8 w-auto min-w-36 py-0 text-[10px]" aria-label="ობიექტი">
          <option value="all">ყველა ობიექტი</option>
          {(Object.keys(ENTITY_LABELS) as AuditLog['entity'][]).map((key) => <option key={key} value={key}>{ENTITY_LABELS[key]}</option>)}
        </AdminSelect>
        <div className="flex flex-1 justify-end">
          <RangeSelector value={range} onChange={(value) => { setRange(value as typeof range); setPage(1); }} options={[{ value: '7d', label: '7 დღე' }, { value: '30d', label: '30 დღე' }, { value: '90d', label: '90 დღე' }, { value: 'all', label: 'ყველა' }]} />
        </div>
      </div>

      <AdminPanel noPadding>
        <div className="hidden md:block">
          <TableWrap>
            <table className="admin-table w-full min-w-[780px]">
              <thead><tr><th>დრო</th><th>ავტორი</th><th>მოქმედება</th><th>ობიექტი</th><th>აღწერა</th><th /></tr></thead>
              <tbody>
                {visible.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-[9px] text-[var(--text-secondary)]">{formatDateTime(entry.createdAt)}</td>
                    <td className="text-[10px]">{entry.actorName}</td>
                    <td><span className="text-[10px] text-[var(--text-primary)]">{actionLabel(entry.action)}</span><span className="mt-0.5 block font-mono text-[8px] text-[var(--text-secondary)]">{entry.action}</span></td>
                    <td><span className="rounded border border-[var(--line)] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">{ENTITY_LABELS[entry.entity]}</span></td>
                    <td className="max-w-72 truncate text-[10px] text-[var(--text-secondary)]">{entry.summary}</td>
                    <td><button type="button" onClick={() => setSelected(entry)} className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">დეტალები</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
        <ul className="divide-y divide-[var(--line)] md:hidden">
          {visible.map((entry) => (
            <li key={entry.id}>
              <button type="button" onClick={() => setSelected(entry)} className="w-full px-4 py-3.5 text-left hover:bg-[var(--surface-hover)]">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-medium">{actionLabel(entry.action)}</p>
                  <span className="shrink-0 text-[8px] text-[var(--text-secondary)]">{timeAgo(entry.createdAt)}</span>
                </div>
                <p className="mt-1 text-[9px] leading-relaxed text-[var(--text-secondary)]">{entry.summary}</p>
                <p className="mt-1.5 text-[8px] text-[var(--text-secondary)]">{entry.actorName} · {ENTITY_LABELS[entry.entity]}</p>
              </button>
            </li>
          ))}
        </ul>
        {!visible.length && (
          <AdminEmpty
            title="ჩანაწერები ვერ მოიძებნა"
            icon={<SearchX className="h-4 w-4" aria-hidden />}
            action={<AdminButton size="sm" variant="secondary" onClick={() => { setSearch(''); setEntity('all'); setRange('all'); }}>ფილტრების გასუფთავება</AdminButton>}
          />
        )}
        <Pagination page={safePage} pageCount={pageCount} onChange={setPage} total={filtered.length} />
      </AdminPanel>

      <AdminModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="აუდიტის ჩანაწერი"
        description={selected ? actionLabel(selected.action) : undefined}
        size="md"
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-hover)]/50 p-4">
              <p className="text-[12px] leading-relaxed text-[var(--text-primary)]">{selected.summary}</p>
              <p className="mt-2 text-[9px] text-[var(--text-secondary)]">{selected.actorName} · {formatDateTime(selected.createdAt)}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-lg border border-[var(--line)] p-2.5"><dt className="text-[8px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">მოქმედება</dt><dd className="mt-1"><InlineCode>{selected.action}</InlineCode></dd></div>
              <div className="rounded-lg border border-[var(--line)] p-2.5"><dt className="text-[8px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">ობიექტი</dt><dd className="mt-1 text-[var(--text-primary)]">{ENTITY_LABELS[selected.entity]}</dd></div>
              <div className="rounded-lg border border-[var(--line)] p-2.5"><dt className="text-[8px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">ობიექტის ID</dt><dd className="mt-1 break-all font-mono text-[9px] text-[var(--text-primary)]">{selected.entityId}</dd></div>
              <div className="rounded-lg border border-[var(--line)] p-2.5"><dt className="text-[8px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">ავტორის ID</dt><dd className="mt-1 break-all font-mono text-[9px] text-[var(--text-primary)]">{selected.actorId}</dd></div>
            </dl>
            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div>
                <p className="mb-2 text-[9px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">მეტამონაცემები</p>
                <pre className="max-h-60 overflow-auto rounded-lg border border-[var(--line)] bg-[var(--surface-hover)]/60 p-3 font-mono text-[9px] leading-relaxed text-[var(--text-primary)]">{JSON.stringify(selected.metadata, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </AdminModal>
    </div>
  );
}
