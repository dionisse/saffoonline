export type View =
  | { kind: 'shop'; categoryId?: string; search?: string }
  | { kind: 'product'; id: string }
  | { kind: 'cart' }
  | { kind: 'checkout' }
  | { kind: 'orders' }
  | { kind: 'order'; id: string }
  | { kind: 'auth' }
  | { kind: 'legal' }
  | { kind: 'terms' }
  | { kind: 'admin-setup' }
  | { kind: 'admin-dashboard' }
  | { kind: 'admin-products' }
  | { kind: 'admin-categories' }
  | { kind: 'admin-orders' }
  | { kind: 'admin-reports' }
  | { kind: 'admin-pos' }
  | { kind: 'admin-stock' }
  | { kind: 'admin-purchases' }
  | { kind: 'admin-payments' }
  | { kind: 'admin-sections' }
  | { kind: 'admin-settings' }
  | { kind: 'admin-banners' }
  | { kind: 'admin-promos' }
  | { kind: 'admin-publications' };

// Re-export for convenience
export type { AdminModule } from './database.types';
