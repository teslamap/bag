import type {
  AnalyticsKpis,
  Category,
  CategoryRevenue,
  Money,
  Order,
  Product,
  Promotion,
  StatusCount,
  TimeSeriesPoint,
  TopProduct,
} from '@/lib/types';
import { ACTIVE_ORDER_STATUSES, ORDER_STATUSES } from '@/lib/constants';
import { dateKey, formatDate, getProductStock, sum } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
}

export function startOfDayLocal(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDayLocal(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function addDaysLocal(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function rangePreset(preset: 'today' | '7d' | '30d' | '90d' | 'month' | 'all', now = new Date()): DateRange {
  const to = endOfDayLocal(now);
  switch (preset) {
    case 'today':
      return { from: startOfDayLocal(now), to };
    case '7d':
      return { from: startOfDayLocal(addDaysLocal(now, -6)), to };
    case '30d':
      return { from: startOfDayLocal(addDaysLocal(now, -29)), to };
    case '90d':
      return { from: startOfDayLocal(addDaysLocal(now, -89)), to };
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), to };
    default:
      return { from: new Date(2020, 0, 1), to: endOfDayLocal(addDaysLocal(now, 365)) };
  }
}

export function isWithinRange(iso: string, range: DateRange): boolean {
  const time = new Date(iso).getTime();
  return time >= range.from.getTime() && time <= range.to.getTime();
}

export function ordersInRange(orders: Order[], range: DateRange): Order[] {
  return orders.filter((order) => isWithinRange(order.createdAt, range));
}

export function revenueOrders(orders: Order[]): Order[] {
  return orders.filter((order) => order.status !== 'cancelled');
}

export function computeKpis(orders: Order[], products: Product[], usersCreatedAt: string[], now = new Date()): AnalyticsKpis {
  const today = rangePreset('today', now);
  const week = rangePreset('7d', now);
  const month = rangePreset('month', now);
  const active = revenueOrders(orders);
  const todayActive = revenueOrders(ordersInRange(orders, today));
  const weekActive = revenueOrders(ordersInRange(orders, week));
  const monthActive = revenueOrders(ordersInRange(orders, month));
  const totalRevenue = sum(active.map((order) => order.total));
  const cancelled = orders.filter((order) => order.status === 'cancelled');
  const newCustomers = usersCreatedAt.filter((iso) => isWithinRange(iso, month)).length;
  const lowStock = products.filter(
    (product) => product.status === 'active' && getProductStock(product) <= product.lowStockThreshold,
  ).length;

  return {
    todayRevenue: sum(todayActive.map((order) => order.total)),
    weekRevenue: sum(weekActive.map((order) => order.total)),
    monthRevenue: sum(monthActive.map((order) => order.total)),
    totalRevenue,
    orderCount: active.length,
    averageOrderValue: active.length ? Math.round(totalRevenue / active.length) : 0,
    cancelledCount: cancelled.length,
    discountTotal: sum(active.map((order) => order.discountTotal)),
    newCustomers,
    lowStockCount: lowStock,
  };
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function dailySeries(
  orders: Order[],
  days: number,
  now = new Date(),
  options: { includeCancelled?: boolean } = {},
): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = addDaysLocal(now, -i);
    const key = dateKey(day);
    const dayOrders = orders.filter(
      (order) =>
        dateKey(order.createdAt) === key && (options.includeCancelled || order.status !== 'cancelled'),
    );
    points.push({
      date: key,
      label: formatDate(day.toISOString()),
      revenue: sum(dayOrders.map((order) => order.total)),
      orders: dayOrders.length,
    });
  }
  return points;
}

export function monthlySeries(orders: Order[], months: number, now = new Date()): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = date.getTime();
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const monthOrders = orders.filter((order) => {
      const time = new Date(order.createdAt).getTime();
      return order.status !== 'cancelled' && time >= start && time <= end;
    });
    points.push({
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: formatDate(date.toISOString(), 'short'),
      revenue: sum(monthOrders.map((order) => order.total)),
      orders: monthOrders.length,
    });
  }
  return points;
}

export function topProducts(
  orders: Order[],
  products: Product[],
  limit = 5,
  range?: DateRange,
): TopProduct[] {
  const scoped = range ? ordersInRange(orders, range) : orders;
  const map = new Map<string, TopProduct>();
  for (const order of revenueOrders(scoped)) {
    for (const item of order.items) {
      const existing = map.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.lineTotal;
      } else {
        map.set(item.productId, {
          productId: item.productId,
          name: item.productName,
          image: item.image,
          quantity: item.quantity,
          revenue: item.lineTotal,
        });
      }
    }
  }
  const productMap = new Map(products.map((p) => [p.id, p]));
  return [...map.values()]
    .map((entry) => {
      const product = productMap.get(entry.productId);
      return {
        ...entry,
        image: product?.images[0]?.source ?? entry.image,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function revenueByCategory(
  orders: Order[],
  products: Product[],
  categories: Category[],
  range?: DateRange,
): CategoryRevenue[] {
  const scoped = range ? ordersInRange(orders, range) : orders;
  const productMap = new Map(products.map((product) => [product.id, product]));
  const map = new Map<string, CategoryRevenue>();
  for (const order of revenueOrders(scoped)) {
    for (const item of order.items) {
      const categoryId = productMap.get(item.productId)?.categoryId ?? 'unknown';
      const categoryName = categories.find((c) => c.id === categoryId)?.name ?? 'სხვა';
      const existing = map.get(categoryId);
      if (existing) {
        existing.revenue += item.lineTotal;
        existing.orders += 1;
      } else {
        map.set(categoryId, {
          categoryId,
          name: categoryName,
          revenue: item.lineTotal,
          orders: 1,
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export function statusCounts(orders: Order[], range?: DateRange): StatusCount[] {
  const scoped = range ? ordersInRange(orders, range) : orders;
  return ORDER_STATUSES.map((status) => ({
    status,
    count: scoped.filter((order) => order.status === status).length,
  }));
}

export function activeOrders(orders: Order[]): Order[] {
  return orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status) && order.status !== 'completed');
}

export function lowStockProducts(products: Product[]): Product[] {
  return products
    .filter(
      (product) =>
        product.status === 'active' && getProductStock(product) <= product.lowStockThreshold,
    )
    .sort((a, b) => getProductStock(a) - getProductStock(b));
}

export function promoUsage(promotions: Promotion[], orders: Order[]) {
  const counts = new Map<string, { orders: number; discount: Money; revenue: Money }>();
  for (const promo of promotions) {
    counts.set(promo.id, { orders: 0, discount: 0, revenue: 0 });
  }
  for (const order of revenueOrders(orders)) {
    if (!order.promoId) continue;
    const entry = counts.get(order.promoId);
    if (!entry) continue;
    entry.orders += 1;
    entry.discount += order.discountTotal;
    entry.revenue += order.total;
  }
  return counts;
}

export function categoryProductCount(products: Product[], categoryId: string): number {
  return products.filter((product) => product.status === 'active' && product.categoryId === categoryId).length;
}
