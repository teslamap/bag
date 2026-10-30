import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ScrollToTop } from '@/components/system/ScrollToTop';
import { ToastViewport } from '@/components/system/ToastViewport';
import { ErrorBoundary } from '@/components/system/ErrorBoundary';
import { RequireAuth, RequireAdmin, RequireStaff } from '@/components/system/Protected';
import { StoreLayout } from '@/components/store/StoreLayout';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ManagerLayout } from '@/components/manager/ManagerLayout';
import { cn } from '@/lib/utils';

function page<T extends Record<string, React.ComponentType>>(
  loader: () => Promise<T>,
  exportName: keyof T,
) {
  return lazy(async () => {
    const module = await loader();
    return { default: module[exportName] };
  });
}

const HomePage = page(() => import('@/pages/store/HomePage'), 'HomePage');
const CatalogPage = page(() => import('@/pages/store/CatalogPage'), 'CatalogPage');
const ProductPage = page(() => import('@/pages/store/ProductPage'), 'ProductPage');
const CartPage = page(() => import('@/pages/store/CartPage'), 'CartPage');
const CheckoutPage = page(() => import('@/pages/store/CheckoutPage'), 'CheckoutPage');
const CheckoutSuccessPage = page(() => import('@/pages/store/CheckoutPage'), 'CheckoutSuccessPage');
const AuthPage = page(() => import('@/pages/store/AuthPage'), 'AuthPage');
const AccountLayout = page(() => import('@/pages/store/AccountLayout'), 'AccountLayout');
const AccountDashboard = page(() => import('@/pages/store/AccountPages'), 'AccountDashboard');
const AccountOrdersPage = page(() => import('@/pages/store/AccountPages'), 'AccountOrdersPage');
const AccountOrderDetailPage = page(() => import('@/pages/store/AccountPages'), 'AccountOrderDetailPage');
const AccountFavoritesPage = page(() => import('@/pages/store/AccountPages'), 'AccountFavoritesPage');
const AccountAddressesPage = page(() => import('@/pages/store/AccountPages'), 'AccountAddressesPage');
const AccountNotificationsPage = page(() => import('@/pages/store/AccountPages'), 'AccountNotificationsPage');
const AccountProfilePage = page(() => import('@/pages/store/AccountPages'), 'AccountProfilePage');
const AboutPage = page(() => import('@/pages/store/InfoPages'), 'AboutPage');
const ContactPage = page(() => import('@/pages/store/InfoPages'), 'ContactPage');
const DeliveryPage = page(() => import('@/pages/store/InfoPages'), 'DeliveryPage');
const CarePage = page(() => import('@/pages/store/InfoPages'), 'CarePage');
const FaqPage = page(() => import('@/pages/store/InfoPages'), 'FaqPage');
const PrivacyPage = page(() => import('@/pages/store/InfoPages'), 'PrivacyPage');
const TermsPage = page(() => import('@/pages/store/InfoPages'), 'TermsPage');
const NotFoundPage = page(() => import('@/pages/store/InfoPages'), 'NotFoundPage');

const AdminDashboardPage = page(() => import('@/pages/admin/DashboardPage'), 'AdminDashboardPage');
const AdminOrdersPage = page(() => import('@/pages/admin/OrdersPage'), 'AdminOrdersPage');
const AdminOrderDetailPage = page(() => import('@/pages/admin/OrderDetailPage'), 'AdminOrderDetailPage');
const AdminProductsPage = page(() => import('@/pages/admin/ProductsPage'), 'AdminProductsPage');
const AdminProductEditorPage = page(() => import('@/pages/admin/ProductEditorPage'), 'AdminProductEditorPage');
const AdminFinancePage = page(() => import('@/pages/admin/FinancePage'), 'AdminFinancePage');
const AdminPromotionsPage = page(() => import('@/pages/admin/PromotionsPage'), 'AdminPromotionsPage');
const AdminCustomersPage = page(() => import('@/pages/admin/CustomersPage'), 'AdminCustomersPage');
const AdminEmployeesPage = page(() => import('@/pages/admin/EmployeesPage'), 'AdminEmployeesPage');
const AdminInventoryPage = page(() => import('@/pages/admin/InventoryPage'), 'AdminInventoryPage');
const AdminReviewsPage = page(() => import('@/pages/admin/ReviewsPage'), 'AdminReviewsPage');
const AdminCategoriesPage = page(() => import('@/pages/admin/AdminCategoriesPage'), 'AdminCategoriesPage');
const AdminNotificationsPage = page(() => import('@/pages/admin/NotificationsPage'), 'AdminNotificationsPage');
const AdminAuditPage = page(() => import('@/pages/admin/AuditPage'), 'AdminAuditPage');
const AdminSettingsPage = page(() => import('@/pages/admin/SettingsPage'), 'AdminSettingsPage');

const ManagerDashboardPage = page(() => import('@/pages/manager/DashboardPage'), 'ManagerDashboardPage');
const ManagerOrdersPage = page(() => import('@/pages/manager/ManagerPages'), 'ManagerOrdersPage');
const ManagerOrderDetailPage = page(() => import('@/pages/manager/ManagerPages'), 'ManagerOrderDetailPage');
const ManagerProductsPage = page(() => import('@/pages/manager/ManagerPages'), 'ManagerProductsPage');
const ManagerProductEditorPage = page(() => import('@/pages/manager/ManagerPages'), 'ManagerProductEditorPage');
const ManagerInventoryPage = page(() => import('@/pages/manager/ManagerPages'), 'ManagerInventoryPage');
const ManagerReviewsPage = page(() => import('@/pages/manager/ManagerPages'), 'ManagerReviewsPage');
const ManagerNotificationsPage = page(() => import('@/pages/manager/ManagerPages'), 'ManagerNotificationsPage');

function RouteLoader() {
  const { pathname } = useLocation();
  const storefront = !pathname.startsWith('/admin') && !pathname.startsWith('/manager');
  return (
    <div className={cn('flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-ivory text-ink', storefront && 'storefront-theme')}>
      <span className="flex h-14 w-14 items-center justify-center border border-ink/15 font-display text-xl tracking-[0.18em]">M</span>
      <div className="h-px w-24 overflow-hidden bg-ink/10">
        <span className="block h-full w-1/2 animate-pulse bg-champagne" />
      </div>
      <p className="text-[9px] uppercase tracking-[0.24em] text-ink/65">იტვირთება</p>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />

            <Route element={<StoreLayout />}>
              <Route index element={<HomePage />} />
              <Route path="catalog" element={<CatalogPage />} />
              <Route path="product/:slug" element={<ProductPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="delivery" element={<DeliveryPage />} />
              <Route path="care" element={<CarePage />} />
              <Route path="faq" element={<FaqPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route
                path="checkout"
                element={
                  <RequireAuth>
                    <CheckoutPage />
                  </RequireAuth>
                }
              />
              <Route
                path="checkout/success/:id"
                element={
                  <RequireAuth>
                    <CheckoutSuccessPage />
                  </RequireAuth>
                }
              />
              <Route
                path="account"
                element={
                  <RequireAuth>
                    <AccountLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<AccountDashboard />} />
                <Route path="orders" element={<AccountOrdersPage />} />
                <Route path="orders/:orderId" element={<AccountOrderDetailPage />} />
                <Route path="favorites" element={<AccountFavoritesPage />} />
                <Route path="addresses" element={<AccountAddressesPage />} />
                <Route path="notifications" element={<AccountNotificationsPage />} />
                <Route path="profile" element={<AccountProfilePage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="products/new" element={<AdminProductEditorPage />} />
              <Route path="products/:id/edit" element={<AdminProductEditorPage />} />
              <Route path="finance" element={<AdminFinancePage />} />
              <Route path="promotions" element={<AdminPromotionsPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="employees" element={<AdminEmployeesPage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="notifications" element={<AdminNotificationsPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>

            <Route
              path="/manager"
              element={
                <RequireStaff>
                  <ManagerLayout />
                </RequireStaff>
              }
            >
              <Route index element={<ManagerDashboardPage />} />
              <Route path="orders" element={<ManagerOrdersPage />} />
              <Route path="orders/:orderId" element={<ManagerOrderDetailPage />} />
              <Route path="products" element={<ManagerProductsPage />} />
              <Route path="products/new" element={<ManagerProductEditorPage />} />
              <Route path="products/:id/edit" element={<ManagerProductEditorPage />} />
              <Route path="inventory" element={<ManagerInventoryPage />} />
              <Route path="reviews" element={<ManagerReviewsPage />} />
              <Route path="notifications" element={<ManagerNotificationsPage />} />
              <Route path="*" element={<Navigate to="/manager" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <ToastViewport />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
