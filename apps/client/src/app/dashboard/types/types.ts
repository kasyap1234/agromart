export interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    change?: {
        value: number;
        type: "increase" | "decrease";
    };
    color?: "primary" | "warning" | "error" | "success";
}

export interface DashboardStats {
    total_products: number;
    low_stock_count: number;
    total_value:number;
    expiring_batches: number;
}

export interface LowStockItem {
    product_name: string;
    product_sku: string;
    current_quantity: number;
    min_stock_level: number;
}

export interface ExpiringBatch {
    product_name: string;
    batch_number: string;
    days_until_expiry: number;
    quantity: number;
}

export interface recentActivity {
    id: string;
    type: "product_added" | "inventory_updated" | "order_created";
    description: string;
    timestamp: string;
}