export type UserRole = 'admin' | 'cashier' | 'employee' | 'customer';

export type AdminModule =
  | 'admin-dashboard'
  | 'admin-products'
  | 'admin-categories'
  | 'admin-orders'
  | 'admin-payments'
  | 'admin-reports'
  | 'admin-pos'
  | 'admin-stock'
  | 'admin-purchases'
  | 'admin-sections'
  | 'admin-settings'
  | 'admin-banners'
  | 'admin-promos'
  | 'admin-publications';

export interface Publication {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  link_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  cta_text: string | null;
  cta_action: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Promotion {
  id: string;
  title: string;
  subtitle: string | null;
  badge_text: string | null;
  badge_color: string;
  image_url: string | null;
  cta_text: string | null;
  cta_action: string | null;
  sort_order: number;
  is_active: boolean;
  ends_at: string | null;
  created_at: string;
}

export interface StoreSettings {
  id: number;
  store_name: string;
  logo_url: string | null;
  company_name: string | null;
  rccm: string | null;
  ifu: string | null;
  whatsapp_number: string | null;
  phone_number: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  whatsapp_url: string | null;
  legal_mentions: string | null;
  terms_of_use: string | null;
  hero_style: 'auto' | 'none';
  whatsapp_notify_number: string | null;
  callmebot_api_key: string | null;
  updated_at: string;
}

export interface Section {
  id: string;
  name: string;
  description: string;
  color: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  section_permissions?: { module: string }[];
}

export interface SectionPermission {
  id: string;
  section_id: string;
  module: AdminModule;
}
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type OrderSource = 'online' | 'pos';
export type PaymentMethod =
  | 'cash'
  | 'mobile_money_mtn'
  | 'mobile_money_moov'
  | 'mobile_money_celtis'
  | 'bank_transfer'
  | 'cash_on_delivery'
  | 'fedapay_online'
  | 'chariow_online';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partial';

export interface Payment {
  id: string;
  order_id: string | null;
  order_number: string;
  method: PaymentMethod;
  operator: string;
  amount: number;
  status: PaymentStatus;
  transaction_id: string;
  chariow_checkout_url: string;
  payer_name: string;
  payer_phone: string;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string;
  section_id: string | null;
  employee_number: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image_url: string;
  sort_order: number;
  parent_id: string | null;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  created_at: string;
}

export interface ProductOptionGroup {
  id: string;
  product_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  product_options?: ProductOption[];
}

export interface ProductOption {
  id: string;
  group_id: string;
  label: string;
  price_modifier: number;
  stock: number;
  track_stock: boolean;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  brand_id: string | null;
  name: string;
  description: string;
  price: number;
  bulk_quantity: number;
  bulk_price: number;
  stock: number;
  low_stock_threshold: number;
  track_stock: boolean;
  image_url: string;
  sku: string;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  source: OrderSource;
  delivery_address: string;
  delivery_assignee: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  cartKey?: string;       // unique per product+option combo
  optionLabel?: string;   // e.g., "L / Rouge"
  priceModifier?: number; // sum of selected option modifiers
  optionStock?: number;   // stock of the selected option (if applicable)
}

export interface Expense {
  id: string;
  label: string;
  category: string;
  amount: number;
  date: string;
  notes: string;
  created_by: string | null;
  created_at: string;
}

export type PurchaseStatus = 'draft' | 'validated' | 'cancelled';

export interface Purchase {
  id: string;
  reference: string;
  label: string;
  invoice_reference: string;
  supplier_name: string;
  date: string;
  status: PurchaseStatus;
  invoice_url: string;
  notes: string;
  total_amount: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
}

export type PromoPartnerType = 'commercial' | 'apporteur';
export type PromoDiscountType = 'percentage' | 'fixed';
export type CommissionStatus = 'pending' | 'paid';

export interface PromoCode {
  id: string;
  code: string;
  partner_name: string;
  partner_phone: string | null;
  partner_email: string | null;
  partner_type: PromoPartnerType;
  commission_rate: number;
  discount_type: PromoDiscountType;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromoUsage {
  id: string;
  promo_code_id: string;
  order_id: string;
  code: string;
  partner_name: string | null;
  order_total: number;
  discount_amount: number;
  commission_rate: number;
  commission_amount: number;
  commission_status: CommissionStatus;
  created_at: string;
}
