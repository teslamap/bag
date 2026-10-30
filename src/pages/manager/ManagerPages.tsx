import { useBackendSnapshot } from '@/state/backend';
import { canManageInventory, canManageOrders, canManageProducts, canManageReviews } from '@/domain/permissions';
import { ManagerPermissionGate } from '@/components/manager/ManagerLayout';
import { AdminOrdersPage } from '@/pages/admin/OrdersPage';
import { AdminOrderDetailPage } from '@/pages/admin/OrderDetailPage';
import { AdminProductsPage } from '@/pages/admin/ProductsPage';
import { AdminProductEditorPage } from '@/pages/admin/ProductEditorPage';
import { AdminInventoryPage } from '@/pages/admin/InventoryPage';
import { AdminReviewsPage } from '@/pages/admin/ReviewsPage';
import { AdminNotificationsPage } from '@/pages/admin/NotificationsPage';

function useManagerPermissions() {
  const snapshot = useBackendSnapshot();
  const session = snapshot.session;
  const role = session?.role ?? 'customer';
  const permissions = session?.permissions ?? [];
  return {
    orders: canManageOrders(role, permissions),
    products: canManageProducts(role, permissions),
    inventory: canManageInventory(role, permissions),
    reviews: canManageReviews(role, permissions),
  };
}

export function ManagerOrdersPage() {
  const allowed = useManagerPermissions().orders;
  return <ManagerPermissionGate allowed={allowed}><AdminOrdersPage basePath="/manager" /></ManagerPermissionGate>;
}

export function ManagerOrderDetailPage() {
  const allowed = useManagerPermissions().orders;
  return (
    <ManagerPermissionGate allowed={allowed}>
      <AdminOrderDetailPage basePath="/manager" managerMode />
    </ManagerPermissionGate>
  );
}

export function ManagerProductsPage() {
  const allowed = useManagerPermissions().products;
  return <ManagerPermissionGate allowed={allowed}><AdminProductsPage basePath="/manager" canManage={allowed} /></ManagerPermissionGate>;
}

export function ManagerProductEditorPage() {
  const allowed = useManagerPermissions().products;
  return <ManagerPermissionGate allowed={allowed}><AdminProductEditorPage basePath="/manager" /></ManagerPermissionGate>;
}

export function ManagerInventoryPage() {
  const allowed = useManagerPermissions().inventory;
  return <ManagerPermissionGate allowed={allowed}><AdminInventoryPage basePath="/manager" canManage={allowed} /></ManagerPermissionGate>;
}

export function ManagerReviewsPage() {
  const allowed = useManagerPermissions().reviews;
  return <ManagerPermissionGate allowed={allowed}><AdminReviewsPage canManage={allowed} /></ManagerPermissionGate>;
}

export function ManagerNotificationsPage() {
  return <AdminNotificationsPage basePath="/manager" />;
}
