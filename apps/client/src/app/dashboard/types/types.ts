import { LucideIcon } from 'lucide-react';

export interface DashboardStats {
  total_products: number;
  low_stock_count: number;
  total_value: number;
  expiring_batches: number;
}

export interface LowStockItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  current_quantity: number;
  min_stock_level: number;
  reorder_point: number;
}

export interface ExpiringBatch {
  batch_id: string;
  batch_number: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  expiry_date: string;
  quantity: number;
  days_until_expiry: number;
}

export interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'primary' | 'warning' | 'error' | 'success';
}