import type { PromoEvaluation } from '@/domain/pricing';
import type {
  Address,
  DataSnapshot,
  EmployeeDraft,
  Order,
  OrderDraft,
  OrderStatus,
  Product,
  ProductDraft,
  ProductStatus,
  Promotion,
  PromotionDraft,
  Category,
  CategoryDraft,
  RegisterInput,
  Review,
  ReviewStatus,
  SessionUser,
  StoreSettings,
  User,
} from '@/lib/types';

export interface PasswordResetRequestResult {
  delivered: boolean;
  demoCode?: string;
}

export interface ReviewInput {
  productId: string;
  rating: number;
  title: string;
  body: string;
}

export interface ProfileInput {
  firstName: string;
  lastName: string;
  phone: string;
}

export interface CommerceBackend {
  mode: 'demo' | 'firebase';
  getSnapshot(): DataSnapshot;
  subscribe(listener: () => void): () => void;
  init(): Promise<void>;

  login(email: string, password: string): Promise<SessionUser>;
  register(input: RegisterInput): Promise<SessionUser>;
  logout(): Promise<void>;
  requestPasswordReset(email: string): Promise<PasswordResetRequestResult>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
  updateProfile(input: ProfileInput): Promise<User>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;

  saveAddress(address: Address): Promise<Address[]>;
  deleteAddress(addressId: string): Promise<void>;
  setDefaultAddress(addressId: string): Promise<void>;
  toggleFavorite(productId: string): Promise<boolean>;

  validatePromo(code: string, subtotal: number): Promise<PromoEvaluation>;
  createOrder(draft: OrderDraft): Promise<Order>;
  updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<Order>;
  addOrderNote(orderId: string, text: string): Promise<void>;

  createReview(input: ReviewInput): Promise<Review>;
  moderateReview(reviewId: string, status: Extract<ReviewStatus, 'approved' | 'rejected'>): Promise<void>;

  markNotificationRead(notificationId: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;

  saveProduct(draft: ProductDraft): Promise<Product>;
  deleteProducts(ids: string[]): Promise<void>;
  setProductsStatus(ids: string[], status: ProductStatus): Promise<void>;
  adjustStock(productId: string, variantId: string, newStock: number, reason: string): Promise<void>;
  uploadImage(file: File): Promise<string>;

  savePromotion(draft: PromotionDraft): Promise<Promotion>;
  deletePromotion(id: string): Promise<void>;
  saveCategory(draft: CategoryDraft): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  createEmployee(draft: EmployeeDraft & { password: string }): Promise<User>;
  updateEmployee(id: string, draft: EmployeeDraft & { password?: string }): Promise<User>;
  setUserStatus(userId: string, status: User['status']): Promise<void>;

  saveSettings(settings: Partial<StoreSettings>): Promise<StoreSettings>;
  resetDemo(): Promise<void>;
}
