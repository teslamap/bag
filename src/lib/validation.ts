import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'შეიყვანეთ ელფოსტა.')
  .email('ელფოსტა არასწორია.');

export const passwordSchema = z
  .string()
  .min(8, 'პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს.')
  .regex(/[A-Za-z]/, 'პაროლი უნდა შეიცავდეს ლათინურ ასოს.')
  .regex(/[0-9]/, 'პაროლი უნდა შეიცავდეს ციფრს.');

export const phoneSchema = z
  .string()
  .trim()
  .min(9, 'ტელეფონის ნომერი არასწორია.')
  .regex(/^[+0-9()\s-]{9,20}$/, 'ტელეფონის ნომერი არასწორია.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'შეიყვანეთ პაროლი.'),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, 'სახელი ძალიან მოკლეა.').max(40),
  lastName: z.string().trim().min(2, 'გვარი ძალიან მოკლეა.').max(40),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  acceptTerms: z.literal(true, { message: 'დაეთანხმეთ წესებსა და პირობებს.' }),
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(2, 'სახელი ძალიან მოკლეა.').max(40),
  lastName: z.string().trim().min(2, 'გვარი ძალიან მოკლეა.').max(40),
  phone: phoneSchema,
});

export const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, 'დაასახელეთ მისამართი.').max(30),
  firstName: z.string().trim().min(2, 'შეიყვანეთ სახელი.'),
  lastName: z.string().trim().min(2, 'შეიყვანეთ გვარი.'),
  phone: phoneSchema,
  city: z.string().trim().min(2, 'აირჩიეთ ქალაქი.'),
  street: z.string().trim().min(4, 'შეიყვანეთ ქუჩა და ნომერი.'),
  apartment: z.string().trim().max(60).optional().default(''),
  postalCode: z.string().trim().max(12).optional().default(''),
  isDefault: z.boolean().optional().default(false),
});

export const contactSchema = z.object({
  firstName: z.string().trim().min(2, 'შეიყვანეთ სახელი.'),
  lastName: z.string().trim().min(2, 'შეიყვანეთ გვარი.'),
  email: emailSchema,
  phone: phoneSchema,
});

export const checkoutSchema = z.object({
  contact: contactSchema,
  address: addressSchema,
  deliveryMethod: z.enum(['standard', 'express']),
  paymentMethod: z.literal('cod'),
  promoCode: z.string().trim().optional(),
  notes: z.string().trim().max(500, 'შენიშვნა ძალიან გრძელია.').optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, 'კალათა ცარიელია.'),
  idempotencyKey: z.string().min(10),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'აირჩიეთ შეფასება.').max(5),
  title: z.string().trim().min(3, 'სათაური ძალიან მოკლეა.').max(80),
  body: z.string().trim().min(12, 'მიმოხილვა უნდა იყოს მინიმუმ 12 სიმბოლო.').max(1200),
});

export const promotionSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'კოდი მინიმუმ 3 სიმბოლოა.')
      .max(24)
      .regex(/^[A-Za-z0-9_-]+$/, 'კოდი შეიძლება შეიცავდეს მხოლოდ ლათინურ ასოებსა და ციფრებს.'),
    description: z.string().trim().min(3, 'დაამატეთ აღწერა.').max(120),
    type: z.enum(['percent', 'fixed']),
    value: z.number().positive('შეიყვანეთ დადებითი მნიშვნელობა.'),
    minOrder: z.number().int().min(0),
    startsAt: z.string().min(1, 'აირჩიეთ დაწყების თარიღი.'),
    endsAt: z.string().min(1, 'აირჩიეთ დასრულების თარიღი.'),
    usageLimit: z.number().int().min(0),
    perUserLimit: z.number().int().min(0),
    active: z.boolean(),
  })
  .refine((value) => (value.type === 'percent' ? value.value <= 100 : true), {
    path: ['value'],
    message: 'პროცენტული ფასდაკლება არ უნდა აღემატებოდეს 100%-ს.',
  })
  .refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
    path: ['endsAt'],
    message: 'დასრულების თარიღი უნდა იყოს დაწყების შემდეგ.',
  });

export const employeeSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().min(2, 'შეიყვანეთ სახელი.'),
  lastName: z.string().trim().min(2, 'შეიყვანეთ გვარი.'),
  phone: phoneSchema,
  role: z.enum(['manager', 'admin']),
  permissions: z.array(
    z.enum(['orders', 'products', 'inventory', 'reviews', 'promotions', 'customers']),
  ),
  status: z.enum(['active', 'suspended']),
  password: z.string().min(8, 'დროებითი პაროლი მინიმუმ 8 სიმბოლოა.').optional(),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, 'შეიყვანეთ პროდუქტის სახელი.').max(80),
  subtitle: z.string().trim().max(140).optional().default(''),
  description: z.string().trim().min(20, 'აღწერა მინიმუმ 20 სიმბოლოა.').max(2400),
  story: z.string().trim().max(1600).optional().default(''),
  categoryId: z.string().min(1, 'აირჩიეთ კატეგორია.'),
  subcategoryId: z.string().min(1, 'აირჩიეთ ქვეკატეგორია.'),
  price: z.number().int().min(1, 'ფასი უნდა იყოს დადებითი.'),
  compareAtPrice: z.number().int().min(0).optional(),
  sku: z.string().trim().min(3, 'SKU მინიმუმ 3 სიმბოლოა.'),
  lowStockThreshold: z.number().int().min(0),
  status: z.enum(['active', 'draft', 'archived']),
  materials: z.string().trim().max(300).optional().default(''),
  dimensions: z.string().trim().max(300).optional().default(''),
  care: z.string().trim().max(600).optional().default(''),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'კატეგორიის სახელი ძალიან მოკლეა.').max(60),
  nameEn: z.string().trim().min(2, 'სახელი (en) საჭიროა.').max(60),
  slug: z.string().trim().min(2, 'სლანგი უნდა იყოს მინიმუმ 2 სიმბოლოს.').max(40),
  description: z.string().trim().max(300).optional().default(''),
  image: z.string().trim().min(1, 'აირჩიეთ სურათის გასაღები.').max(80),
  order: z.number().int().min(0),
  active: z.boolean(),
});

export const settingsSchema = z.object({
  storeName: z.string().trim().min(2),
  tagline: z.string().trim().min(2),
  supportEmail: emailSchema,
  supportPhone: phoneSchema,
  address: z.string().trim().min(5),
  freeShippingThreshold: z.number().int().min(0),
  standardShippingFee: z.number().int().min(0),
  expressShippingFee: z.number().int().min(0),
  codEnabled: z.boolean(),
  codInstructions: z.string().trim().max(600),
  lowStockThreshold: z.number().int().min(0),
  announcement: z.string().trim().max(160),
  instagramUrl: z.string().trim().url().or(z.literal('')),
  facebookUrl: z.string().trim().url().or(z.literal('')),
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
