import { describe, expect, it } from 'vitest';
import type { OrderStatus, Role, StaffPermission } from '@/lib/types';
import {
  canAccessAdmin,
  canAccessManager,
  canManageCustomers,
  canManageInventory,
  canManageOrders,
  canManageProducts,
  canManagePromotions,
  canManageReviews,
  canManageSettings,
  canManageStaff,
  canTransition,
  canViewOrder,
  isOrderRevenue,
  isOrderTerminal,
} from '@/domain/permissions';

const ALL_PERMISSIONS: StaffPermission[] = [
  'orders',
  'products',
  'inventory',
  'reviews',
  'promotions',
  'customers',
];

describe('order transitions', () => {
  it('allows the happy path from new to completed', () => {
    const path: OrderStatus[] = ['new', 'confirmed', 'processing', 'shipped', 'completed'];
    for (let index = 0; index < path.length - 1; index += 1) {
      expect(canTransition(path[index], path[index + 1])).toBe(true);
    }
  });

  it('allows cancellation until completion and forbids skips or revival', () => {
    expect(canTransition('new', 'cancelled')).toBe(true);
    expect(canTransition('confirmed', 'cancelled')).toBe(true);
    expect(canTransition('processing', 'cancelled')).toBe(true);
    expect(canTransition('shipped', 'cancelled')).toBe(true);
    expect(canTransition('completed', 'cancelled')).toBe(false);
    expect(canTransition('cancelled', 'new')).toBe(false);
    expect(canTransition('new', 'shipped')).toBe(false);
    expect(canTransition('confirmed', 'completed')).toBe(false);
  });

  it('marks terminal and revenue orders correctly', () => {
    expect(isOrderTerminal('completed')).toBe(true);
    expect(isOrderTerminal('cancelled')).toBe(true);
    expect(isOrderTerminal('shipped')).toBe(false);
    expect(isOrderRevenue('cancelled')).toBe(false);
    expect(isOrderRevenue('completed')).toBe(true);
    expect(isOrderRevenue('new')).toBe(true);
  });
});

describe('order visibility', () => {
  it('lets staff see any order and customers only their own', () => {
    const order = { userId: 'customer-1' };
    expect(canViewOrder({ id: 'admin-1', role: 'admin' }, order)).toBe(true);
    expect(canViewOrder({ id: 'manager-1', role: 'manager' }, order)).toBe(true);
    expect(canViewOrder({ id: 'customer-1', role: 'customer' }, order)).toBe(true);
    expect(canViewOrder({ id: 'customer-2', role: 'customer' }, order)).toBe(false);
    expect(canViewOrder(null, order)).toBe(false);
  });
});

describe('staff permission gates', () => {
  const checks: Array<{
    name: string;
    isAllowed: (role: Role, permissions: StaffPermission[]) => boolean;
  }> = [
    { name: 'orders', isAllowed: canManageOrders },
    { name: 'products', isAllowed: canManageProducts },
    { name: 'inventory', isAllowed: canManageInventory },
    { name: 'promotions', isAllowed: canManagePromotions },
    { name: 'reviews', isAllowed: canManageReviews },
    { name: 'customers', isAllowed: canManageCustomers },
  ];

  it('always grants administrators every staff permission', () => {
    for (const check of checks) {
      expect(check.isAllowed('admin', []), check.name).toBe(true);
    }
    expect(canManageStaff('admin')).toBe(true);
    expect(canManageSettings('admin')).toBe(true);
  });

  it('grants managers only their explicit permissions', () => {
    for (const check of checks) {
      expect(check.isAllowed('manager', [check.name as StaffPermission]), check.name).toBe(true);
      expect(check.isAllowed('manager', ALL_PERMISSIONS.filter((entry) => entry !== check.name)), check.name).toBe(
        false,
      );
    }
    expect(canManageStaff('manager')).toBe(false);
    expect(canManageSettings('manager')).toBe(false);
  });

  it('never grants customers staff capabilities or workspace access', () => {
    for (const check of checks) {
      expect(check.isAllowed('customer', ALL_PERMISSIONS), check.name).toBe(false);
    }
    expect(canAccessAdmin('customer')).toBe(false);
    expect(canAccessManager('customer')).toBe(false);
    expect(canManageStaff('customer')).toBe(false);
    expect(canManageSettings('customer')).toBe(false);
  });

  it('separates admin and manager workspaces', () => {
    expect(canAccessAdmin('admin')).toBe(true);
    expect(canAccessAdmin('manager')).toBe(false);
    expect(canAccessManager('admin')).toBe(true);
    expect(canAccessManager('manager')).toBe(true);
  });
});
