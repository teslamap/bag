import type { Order, OrderStatus, Role, SessionUser, StaffPermission } from '@/lib/types';
import { ORDER_TRANSITIONS } from '@/lib/constants';

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function isOrderTerminal(status: OrderStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

export function isOrderRevenue(status: OrderStatus): boolean {
  return status !== 'cancelled';
}

export function canViewOrder(session: Pick<SessionUser, 'id' | 'role'> | null, order: Pick<Order, 'userId'>): boolean {
  if (!session) return false;
  if (session.role === 'admin') return true;
  if (session.role === 'manager') return true;
  return order.userId === session.id;
}

export function canManageOrders(role: Role, permissions: StaffPermission[] = []): boolean {
  if (role === 'admin') return true;
  return role === 'manager' && permissions.includes('orders');
}

export function canManageProducts(role: Role, permissions: StaffPermission[] = []): boolean {
  if (role === 'admin') return true;
  return role === 'manager' && permissions.includes('products');
}

export function canManageInventory(role: Role, permissions: StaffPermission[] = []): boolean {
  if (role === 'admin') return true;
  return role === 'manager' && permissions.includes('inventory');
}

export function canManagePromotions(role: Role, permissions: StaffPermission[] = []): boolean {
  if (role === 'admin') return true;
  return role === 'manager' && permissions.includes('promotions');
}

export function canManageReviews(role: Role, permissions: StaffPermission[] = []): boolean {
  if (role === 'admin') return true;
  return role === 'manager' && permissions.includes('reviews');
}

export function canManageCustomers(role: Role, permissions: StaffPermission[] = []): boolean {
  if (role === 'admin') return true;
  return role === 'manager' && permissions.includes('customers');
}

export function canManageStaff(role: Role): boolean {
  return role === 'admin';
}

export function canManageSettings(role: Role): boolean {
  return role === 'admin';
}

export function canAccessAdmin(role: Role): boolean {
  return role === 'admin';
}

export function canAccessManager(role: Role): boolean {
  return role === 'admin' || role === 'manager';
}
