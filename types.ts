
export enum UserRole {
  ADMIN = 'admin',
  COMMERCE = 'commerce',
  LIVREUR = 'livreur'
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  store_id?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  max_stock_level: number;
  image_url?: string;
  is_active: boolean;
}

export interface Sale {
  id: string;
  sale_number: string;
  customer_name: string;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'mobile_money';
  status: 'draft' | 'completed' | 'cancelled' | 'refunded';
  delivery_status: 'pending' | 'en_route' | 'delivered' | 'returned';
  created_at: string;
  created_by: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Delivery {
  id: string;
  user_id?: string;
  driver_name: string;
  current_lat: number;
  current_lng: number;
  status: 'available' | 'busy' | 'offline';
  work_status: 'active' | 'rest';
  order_id?: string;
  battery_level?: number;
  updated_at?: string;
}

export interface BusinessInfo {
  id: number;
  type: string;
  name: string;
  address: string;
  phone: string;
}
