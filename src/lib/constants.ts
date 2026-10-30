import type {
  DeliveryMethod,
  OrderStatus,
  PaymentMethod,
  ProductStatus,
  Role,
  StaffPermission,
} from '@/lib/types';

export const BRAND = {
  name: 'MAKU',
  nameKa: 'მაკუ',
  tagline: 'ობიექტები, რომლებიც დროს უძლებს',
  city: 'თბილისი',
  established: '2018',
  email: 'hello@maku.ge',
  phone: '+995 322 50 18 18',
  address: 'აბაშიძის ქ. 24, თბილისი',
  instagram: 'https://instagram.com',
};

export const ORDER_STATUSES: OrderStatus[] = [
  'new',
  'confirmed',
  'processing',
  'shipped',
  'completed',
  'cancelled',
];

export const FULFILLMENT_STATUSES: OrderStatus[] = [
  'new',
  'confirmed',
  'processing',
  'shipped',
  'completed',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'ახალი',
  confirmed: 'დადასტურებული',
  processing: 'მზადდება',
  shipped: 'გაგზავნილი',
  completed: 'დასრულებული',
  cancelled: 'გაუქმებული',
};

export const ORDER_STATUS_HINTS: Record<OrderStatus, string> = {
  new: 'შეკვეთა მიღებულია და ელოდება დადასტურებას',
  confirmed: 'შეკვეთა დადასტურდა და გადავიდა მომზადებაზე',
  processing: 'შეკვეთა მზადდება ატელიეში',
  shipped: 'შეკვეთა გადაეცა კურიერს',
  completed: 'შეკვეთა წარმატებით მიწოდდა',
  cancelled: 'შეკვეთა გაუქმებულია',
};

/** Allowed transitions enforced by the backend. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'new',
  'confirmed',
  'processing',
  'shipped',
  'completed',
];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'აქტიური',
  draft: 'დრაფტი',
  archived: 'არქივი',
};

export const ROLE_LABELS: Record<Role, string> = {
  customer: 'მომხმარებელი',
  manager: 'მენეჯერი',
  admin: 'ადმინისტრატორი',
};

export const PERMISSION_LABELS: Record<StaffPermission, string> = {
  orders: 'შეკვეთები',
  products: 'პროდუქცია',
  inventory: 'მარაგი',
  reviews: 'მიმოხილვები',
  promotions: 'პრომოკოდები',
  customers: 'მომხმარებლები',
};

export const MANAGER_DEFAULT_PERMISSIONS: StaffPermission[] = [
  'orders',
  'products',
  'inventory',
  'reviews',
];

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  standard: 'სტანდარტული მიწოდება',
  express: 'ექსპრეს მიწოდება',
};

export const DELIVERY_METHOD_HINTS: Record<DeliveryMethod, string> = {
  standard: '2–4 სამუშაო დღე თბილისში, 3–6 რეგიონებში',
  express: 'ერთ სამუშაო დღეში, თბილისის მასშტაბით',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: 'გადახდა მიღებისას',
};

export const DEMO_ACCOUNTS: Array<{ role: string; email: string; password: string }> = [];

export const PUBLIC_NAV = [
  { label: 'მაღაზია', to: '/catalog' },
  { label: 'ჩანთები', to: '/catalog?category=bags' },
  { label: 'აქსესუარები', to: '/catalog?category=accessories' },
  { label: 'ატელიე', to: '/about' },
  { label: 'კონტაქტი', to: '/contact' },
] as const;

export const FOOTER_LINKS = {
  shop: [
    { label: 'ყველა პროდუქტი', to: '/catalog' },
    { label: 'ახალი კოლექცია', to: '/catalog?filter=new' },
    { label: 'ბესტსელერები', to: '/catalog?filter=bestsellers' },
    { label: 'ფასდაკლებები', to: '/catalog?filter=sale' },
  ],
  care: [
    { label: 'მიწოდება და დაბრუნება', to: '/delivery' },
    { label: 'პროდუქტის მოვლა', to: '/care' },
    { label: 'კონტაქტი', to: '/contact' },
    { label: 'ხშირად დასმული კითხვები', to: '/faq' },
  ],
  legal: [
    { label: 'კონფიდენციალურობა', to: '/privacy' },
    { label: 'წესები და პირობები', to: '/terms' },
  ],
};

export const COLLECTIONS = [
  {
    id: 'atelier',
    eyebrow: 'კოლექცია 01',
    title: 'ატელიეს ობიექტები',
    description: 'ხელით აწყობილი ტყავის ფორმები, შექმნილი მცირე ტირაჟებად.',
    image: 'bag-generic-01',
    href: '/catalog?collection=atelier',
  },
  {
    id: 'everyday',
    eyebrow: 'კოლექცია 02',
    title: 'ყოველდღიური იკონები',
    description: 'მსუბუქი, ფუნქციური და უდროო — დილიდან საღამომდე.',
    image: 'hero-main',
    href: '/catalog?collection=everyday',
  },
  {
    id: 'evening',
    eyebrow: 'კოლექცია 03',
    title: 'საღამოს საათები',
    description: 'მცირე ზომის ფორმები, სადაც დეტალი ყველაფერს წყვეტს.',
    image: 'bag-generic-08',
    href: '/catalog?collection=evening',
  },
] as const;

export const POPULAR_SEARCHES = [
  'ტყავის ჩანთა',
  'ტოტი',
  'მინი ჩანთა',
  'აბრეშუმის შარფი',
  'ოქროს სამკაული',
];

export const GEORGIAN_CITIES = [
  'თბილისი',
  'ბათუმი',
  'ქუთაისი',
  'რუსთავი',
  'გორი',
  'თელავი',
  'სიღნაღი',
  'ზუგდიდი',
  'ფოთი',
  'მცხეთა',
  'სხვა',
];
