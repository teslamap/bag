import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Money, OrderStatus, Product, ProductVariant } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LARI = '₾';

export function formatMoney(value: Money, options?: { compact?: boolean }): string {
  if (options?.compact && Math.abs(value) >= 1000) {
    return `${LARI}${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`;
  }
  const isWhole = Math.abs(value % 1) < 0.005;
  return `${LARI}${value.toLocaleString('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function parseMoneyInput(value: string): number {
  const normalized = value.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

export function moneyToInput(value: Money): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

const GE_MONTHS_SHORT = [
  'იან',
  'თებ',
  'მარ',
  'აპრ',
  'მაი',
  'ივნ',
  'ივლ',
  'აგვ',
  'სექ',
  'ოქტ',
  'ნოე',
  'დეკ',
];

const GE_MONTHS = [
  'იანვარი',
  'თებერვალი',
  'მარტი',
  'აპრილი',
  'მაისი',
  'ივნისი',
  'ივლისი',
  'აგვისტო',
  'სექტემბერი',
  'ოქტომბერი',
  'ნოემბერი',
  'დეკემბერი',
];

const GE_WEEKDAYS = ['კვ', 'ორშ', 'სამშ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];

export function formatDate(iso: string, mode: 'short' | 'long' | 'numeric' | 'day' = 'short'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  switch (mode) {
    case 'long':
      return `${day} ${GE_MONTHS[month]}, ${year}`;
    case 'numeric':
      return `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
    case 'day':
      return `${GE_WEEKDAYS[date.getDay()]}, ${day} ${GE_MONTHS_SHORT[month]}`;
    default:
      return `${day} ${GE_MONTHS_SHORT[month]}`;
  }
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDate(iso, 'long')} · ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ახლა';
  if (minutes < 60) return `${minutes} წუთის წინ`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} საათის წინ`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} დღის წინ`;
  return formatDate(iso);
}

export function toDateInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function dateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function makeId(prefix = ''): string {
  const value =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${value}` : value;
}

export function makeIdempotencyKey(): string {
  return makeId(`idem_${Date.now().toString(36)}`);
}

export function slugify(value: string): string {
  const latin = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return latin || `item-${Date.now().toString(36)}`;
}

export function isSeedAsset(source: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(source);
}

export function imageSrc(source: string, width = 960): string {
  if (isSeedAsset(source)) return `/images/opt/${source}-${width}.webp`;
  return source;
}

export function imageSrcSet(source: string): string | undefined {
  if (!isSeedAsset(source)) return undefined;
  return [480, 960, 1600].map((width) => `${imageSrc(source, width)} ${width}w`).join(', ');
}

export function primaryImage(product: Pick<Product, 'images'>, width = 960): string {
  const source = product.images[0]?.source;
  return source ? imageSrc(source, width) : '/images/placeholder.svg';
}

export function primaryImageAlt(product: Pick<Product, 'images' | 'name'>): string {
  return product.images[0]?.alt || product.name;
}

export function getVariantLabel(product: Product, variant: ProductVariant): string {
  return product.options
    .map((option) => {
      const selected = variant.options[option.name];
      return option.values.find((value) => value.value === selected)?.label ?? selected;
    })
    .filter(Boolean)
    .join(' · ');
}

export function getProductStock(product: Product): number {
  if (!product.variants.length) return product.stock;
  return product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stock), 0);
}

export function isLowStock(product: Product, threshold = product.lowStockThreshold): boolean {
  return getProductStock(product) <= threshold;
}

export function discountPercent(price: Money, compareAt?: Money): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export const STATUS_TONES: Record<OrderStatus, 'neutral' | 'info' | 'accent' | 'success' | 'danger' | 'warning'> = {
  new: 'accent',
  confirmed: 'info',
  processing: 'warning',
  shipped: 'info',
  completed: 'success',
  cancelled: 'danger',
};

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
}

export function getFullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local.slice(0, 2)}${'•'.repeat(Math.max(2, local.length - 2))}@${domain}`;
}

export function truncate(value: string, length = 120): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length).trimEnd()}…`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface AndroidFileBridge {
  saveBase64(filename: string, dataUrl: string): void;
}

function saveViaAndroidBridge(filename: string, blob: Blob): boolean {
  const bridge = (window as Window & { MakuAndroid?: AndroidFileBridge }).MakuAndroid;
  if (!bridge || blob.size > 20 * 1024 * 1024) return false;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') bridge.saveBase64(filename, reader.result);
  };
  reader.readAsDataURL(blob);
  return true;
}

export function downloadBlob(filename: string, blob: Blob) {
  if (saveViaAndroidBridge(filename, blob)) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  const escapeCell = (value: string | number | boolean | null | undefined) => {
    const raw = value == null ? '' : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };
  const csv = [headers.map(escapeCell).join(','), ...rows.map((row) => row.map(escapeCell).join(','))].join('\r\n');
  downloadBlob(filename, new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
}

export async function copyText(value: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement('textarea');
  area.value = value;
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

export async function fileToCompressedDataUrl(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('აირჩიეთ სურათის ფაილი.');
  if (file.size > 8 * 1024 * 1024) throw new Error('სურათი ძალიან დიდია — მაქსიმუმ 8MB.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('ფაილის წაკითხვა ვერ მოხერხდა.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('სურათის დამუშავება ვერ მოხერხდა.'));
    img.src = dataUrl;
  });
  if (image.width <= maxWidth) return dataUrl;
  const ratio = maxWidth / image.width;
  const canvas = document.createElement('canvas');
  canvas.width = maxWidth;
  canvas.height = Math.round(image.height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', quality);
}

export function groupBy<T, K extends string | number>(items: T[], key: (item: T) => K): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = key(item);
      (acc[k] ||= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function pluralizeKa(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}
