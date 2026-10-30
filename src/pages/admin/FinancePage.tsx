import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Banknote, Coins, Download, ReceiptText, TrendingUp } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import {
  AdminButton,
  AdminChip,
  AdminEmpty,
  AdminPageHeader,
  AdminPanel,
  AdminStat,
  MoneyText,
  OrderStatusPill,
  Pagination,
  RangeSelector,
  TableWrap,
} from '@/components/admin/AdminUI';
import { TrendChart, Donut } from '@/components/admin/Charts';
import {
  dailySeries,
  monthlySeries,
  ordersInRange,
  percentChange,
  rangePreset,
  revenueOrders,
  statusCounts,
} from '@/domain/analytics';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import { downloadCsv, formatDate, formatMoney, getFullName, sum } from '@/lib/utils';

type Range = '7d' | '30d' | '90d';

export function AdminFinancePage() {
  const snapshot = useBackendSnapshot();
  const [range, setRange] = useState<Range>('30d');
  const [payment, setPayment] = useState<'all' | 'unpaid' | 'paid' | 'refunded'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const data = useMemo(() => {
    const preset = rangePreset(range);
    const scoped = ordersInRange(snapshot.orders, preset);
    const active = revenueOrders(scoped);
    const revenue = sum(active.map((order) => order.total));
    const discounts = sum(active.map((order) => order.discountTotal));
    const shipping = sum(active.map((order) => order.shippingFee));
    const refunded = snapshot.orders
      .filter((order) => order.paymentStatus === 'refunded' && new Date(order.updatedAt).getTime() >= preset.from.getTime())
      .reduce((total, order) => total + order.total, 0);
    const receivable = snapshot.orders
      .filter((order) => order.paymentStatus === 'unpaid' && order.status !== 'cancelled')
      .reduce((total, order) => total + order.total, 0);
    const previousPreset = rangePreset(
      range,
      new Date(range === '7d' ? Date.now() - 7 * 86400000 : range === '90d' ? Date.now() - 90 * 86400000 : Date.now() - 30 * 86400000),
    );
    const previous = revenueOrders(ordersInRange(snapshot.orders, previousPreset));
    const previousRevenue = sum(previous.map((order) => order.total));
    const aov = active.length ? Math.round(revenue / active.length) : 0;
    const previousAov = previous.length ? Math.round(previousRevenue / previous.length) : 0;
    const paymentTotals = {
      paid: snapshot.orders.filter((order) => order.paymentStatus === 'paid').reduce((total, order) => total + order.total, 0),
      unpaid: receivable,
      refunded,
    };
    const filteredPayments = [...scoped]
      .filter((order) => payment === 'all' || order.paymentStatus === payment)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      scoped,
      active,
      revenue,
      discounts,
      shipping,
      refunded,
      receivable,
      aov,
      aovDelta: percentChange(aov, previousAov),
      revenueDelta: percentChange(revenue, previousRevenue),
      countDelta: percentChange(active.length, previous.length),
      daily: dailySeries(snapshot.orders, range === '7d' ? 7 : range === '90d' ? 90 : 30),
      monthly: monthlySeries(snapshot.orders, 6),
      statuses: statusCounts(scoped),
      paymentTotals,
      filteredPayments,
      net: revenue - refunded,
    };
  }, [snapshot.orders, range, payment]);

  const pageCount = Math.max(1, Math.ceil(data.filteredPayments.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = data.filteredPayments.slice((safePage - 1) * pageSize, safePage * pageSize);

  const exportCsv = () => {
    downloadCsv(
      `maku-finance-${range}.csv`,
      ['თარიღი', 'შეკვეთა', 'მომხმარებელი', 'ქვეჯამი', 'ფასდაკლება', 'მიწოდება', 'ჯამი', 'გადახდის სტატუსი', 'შეკვეთის სტატუსი'],
      data.filteredPayments.map((order) => [
        formatDate(order.createdAt, 'numeric'),
        order.number,
        getFullName(order.customer),
        (order.subtotal).toFixed(2),
        (order.discountTotal).toFixed(2),
        (order.shippingFee).toFixed(2),
        (order.total).toFixed(2),
        order.paymentStatus,
        ORDER_STATUS_LABELS[order.status],
      ]),
    );
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="ფინანსები"
        title="ფინანსური მიმოხილვა"
        description="შემოსავალი, ფასდაკლებები, მიწოდების საფასური და მისაღები თანხები — მხოლოდ ადმინისტრატორისთვის."
        actions={
          <>
            <RangeSelector value={range} onChange={(value) => { setRange(value as Range); setPage(1); }} options={[{ value: '7d', label: '7 დღე' }, { value: '30d', label: '30 დღე' }, { value: '90d', label: '90 დღე' }]} />
            <AdminButton variant="secondary" size="sm" leftIcon={<Download className="h-3.5 w-3.5" aria-hidden />} onClick={exportCsv}>CSV</AdminButton>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="წმინდა შემოსავალი" value={formatMoney(data.net)} delta={data.revenueDelta} sub="დაბრუნებების გათვალისწინებით" icon={<TrendingUp className="h-4 w-4" aria-hidden />} />
        <AdminStat label="საშუალო შეკვეთა" value={formatMoney(data.aov)} delta={data.aovDelta} sub={`${data.active.length} გადახდილი ხაზი`} icon={<ReceiptText className="h-4 w-4" aria-hidden />} />
        <AdminStat label="ფასდაკლებები" value={formatMoney(data.discounts)} sub="პრომოკოდებითა და ფასებით" icon={<Coins className="h-4 w-4" aria-hidden />} accent="warning" />
        <AdminStat label="მისაღები COD" value={formatMoney(data.receivable)} sub="გადაუხდელი აქტიური შეკვეთები" icon={<Banknote className="h-4 w-4" aria-hidden />} accent={data.receivable ? 'danger' : 'success'} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        <AdminPanel
          title="შემოსავლის დინამიკა"
          eyebrow={range === '7d' ? 'ბოლო 7 დღე' : range === '90d' ? 'ბოლო 90 დღე' : 'ბოლო 30 დღე'}
          action={<div className="text-[9px] text-[var(--text-secondary)]">{formatMoney(data.revenue)} · {data.active.length} შეკვეთა</div>}
        >
          <TrendChart points={data.daily} height={240} />
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-4 text-center">
            <div>
              <p className="text-[8px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">შემოსავალი</p>
              <p className="mt-1 text-[12px] font-medium tabular-nums">{formatMoney(data.revenue)}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">მიწოდება</p>
              <p className="mt-1 text-[12px] font-medium tabular-nums">{formatMoney(data.shipping)}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">დაბრუნება</p>
              <p className="mt-1 text-[12px] font-medium tabular-nums text-[var(--tone-danger-text)]">{formatMoney(data.refunded)}</p>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="გადახდების სტატუსი" eyebrow="COD ნაკადი">
          <Donut
            segments={[
              { label: 'გადახდილი', value: data.paymentTotals.paid },
              { label: 'მისაღები', value: data.paymentTotals.unpaid },
              { label: 'დაბრუნებული', value: data.paymentTotals.refunded },
            ]}
            centerLabel="მთლიანი"
            centerValue={formatMoney(data.paymentTotals.paid + data.paymentTotals.unpaid, { compact: true })}
          />
          <ul className="mt-4 space-y-2.5 border-t border-[var(--line)] pt-4 text-[10px]">
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[var(--text-secondary)]"><span className="h-1.5 w-1.5 rounded-full bg-[#8fc2a2]" aria-hidden /> გადახდილი</span>
              <span className="tabular-nums">{formatMoney(data.paymentTotals.paid)}</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[var(--text-secondary)]"><span className="h-1.5 w-1.5 rounded-full bg-[#c6aa82]" aria-hidden /> მისაღები</span>
              <span className="tabular-nums">{formatMoney(data.paymentTotals.unpaid)}</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[var(--text-secondary)]"><span className="h-1.5 w-1.5 rounded-full bg-[#a04a4a]" aria-hidden /> დაბრუნებული</span>
              <span className="tabular-nums">{formatMoney(data.paymentTotals.refunded)}</span>
            </li>
          </ul>
        </AdminPanel>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <AdminPanel title="ექვსთვიანი დინამიკა" eyebrow="თვიური">
          <TrendChart points={data.monthly} height={210} />
        </AdminPanel>
        <AdminPanel title="შეკვეთების სტატუსები" eyebrow="პერიოდი" noPadding>
          <ul className="divide-y divide-[var(--line)]">
            {data.statuses.map((entry) => (
              <li key={entry.status} className="flex items-center justify-between gap-3 px-4 py-3">
                <OrderStatusPill status={entry.status} />
                <div className="flex items-center gap-3">
                  <span className="text-[10px] tabular-nums text-[var(--text-secondary)]">{entry.count}</span>
                  <span className="text-[9px] text-[var(--text-secondary)]">
                    {data.scoped.length ? Math.round((entry.count / data.scoped.length) * 100) : 0}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>

      <AdminPanel
        title="ტრანზაქციების ჟურნალი"
        eyebrow={`${data.filteredPayments.length} ჩანაწერი`}
        action={
          <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
            {(['all', 'paid', 'unpaid', 'refunded'] as const).map((entry) => (
              <AdminChip key={entry} active={payment === entry} onClick={() => { setPayment(entry); setPage(1); }}>
                {entry === 'all' ? 'ყველა' : entry === 'paid' ? 'გადახდილი' : entry === 'unpaid' ? 'მისაღები' : 'დაბრუნებული'}
              </AdminChip>
            ))}
          </div>
        }
        noPadding
      >
        <div className="hidden md:block">
          <TableWrap>
            <table className="admin-table w-full min-w-[760px]">
              <thead><tr><th>თარიღი</th><th>შეკვეთა</th><th>მომხმარებელი</th><th>ქვეჯამი</th><th>ფასდაკლება</th><th>მიწოდება</th><th>ჯამი</th><th>გადახდა</th></tr></thead>
              <tbody>
                {rows.map((order) => (
                  <tr key={order.id}>
                    <td className="whitespace-nowrap text-[10px] text-[var(--text-secondary)]">{formatDate(order.createdAt)}</td>
                    <td><span className="font-medium">{order.number}</span><span className="mt-0.5 block text-[9px] text-[var(--text-secondary)]">{ORDER_STATUS_LABELS[order.status]}</span></td>
                    <td className="text-[10px]">{getFullName(order.customer)}</td>
                    <td><MoneyText value={order.subtotal} /></td>
                    <td className={order.discountTotal ? 'text-[var(--tone-success-text)]' : 'text-[var(--text-secondary)]'}>{order.discountTotal ? `−${formatMoney(order.discountTotal)}` : '—'}</td>
                    <td className="text-[10px] text-[var(--text-secondary)]">{order.shippingFee ? formatMoney(order.shippingFee) : 'უფასო'}</td>
                    <td><MoneyText value={order.total} className="font-medium" /></td>
                    <td>
                      <span className={order.paymentStatus === 'paid' ? 'text-[var(--tone-success-text)]' : order.paymentStatus === 'refunded' ? 'text-[var(--tone-danger-text)]' : 'text-[var(--text-secondary)]'}>
                        {order.paymentStatus === 'paid' ? 'გადახდილი' : order.paymentStatus === 'refunded' ? 'დაბრუნებული' : 'მისაღები'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
        <ul className="divide-y divide-[var(--line)] md:hidden">
          {rows.map((order) => (
            <li key={order.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium">{order.number}</p>
                  <p className="mt-0.5 text-[9px] text-[var(--text-secondary)]">{formatDate(order.createdAt)} · {getFullName(order.customer)}</p>
                </div>
                <MoneyText value={order.total} className="text-[12px] font-medium" />
              </div>
              <div className="mt-2 flex items-center justify-between text-[9px] text-[var(--text-secondary)]">
                <span>{order.paymentStatus === 'paid' ? 'გადახდილი' : order.paymentStatus === 'refunded' ? 'დაბრუნებული' : 'მისაღები'} · {order.items.length} პოზიცია</span>
                <span>{order.discountTotal ? `−${formatMoney(order.discountTotal)}` : ''}</span>
              </div>
            </li>
          ))}
        </ul>
        {!rows.length && <AdminEmpty title="ტრანზაქციები არ მოიძებნა" description="ამ ფილტრით ჩანაწერები არ არის." />}
        <Pagination page={safePage} pageCount={pageCount} onChange={setPage} total={data.filteredPayments.length} />
      </AdminPanel>

      <div className="grid gap-3 md:grid-cols-2">
        <AdminPanel title="მიმდინარე ბალანსი" eyebrow="მარტივი აღრიცხვა">
          <div className="space-y-2.5 text-[11px]">
            <div className="flex items-center justify-between"><span className="text-[var(--text-secondary)]">მთლიანი შემოსავალი</span><MoneyText value={data.revenue} /></div>
            <div className="flex items-center justify-between"><span className="text-[var(--text-secondary)]">დაბრუნებები</span><span className="text-[var(--tone-danger-text)]">−{formatMoney(data.refunded)}</span></div>
            <div className="flex items-center justify-between border-t border-[var(--line)] pt-2.5 font-medium"><span>წმინდა</span><MoneyText value={data.net} /></div>
          </div>
        </AdminPanel>
        <AdminPanel title="შენიშვნა" eyebrow="აღრიცხვის პოლიტიკა">
          <p className="text-[10px] leading-relaxed text-[var(--text-secondary)]">
            ფინანსური მაჩვენებლები აგებულია გაუქმებული შეკვეთების გარეშე. „მისაღები“ აჩვენებს მიღებისას გადასახდელ აქტიურ შეკვეთებს; „დაბრუნებული“ — გაუქმებისას დაბრუნებულ თანხებს. ეს არის ოპერაციული აღრიცხვა და არა ბუღალტრული დოკუმენტი.
          </p>
        </AdminPanel>
      </div>
    </div>
  );
}
