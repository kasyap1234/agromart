import React from 'react'
import { Package } from 'lucide-react';
import { LowStockItem } from '@/app/dashboard/types/types';
import InfoCard from './InfoCard';
import { Badge } from '@/components/ui/badge';

interface Props {
  lowStock?: LowStockItem[];
}

export default function LowStockItems({lowStock=[]}:Props) {
  const columns = [
    {
      header: 'Product',
      accessor: 'product_name' as const,
    },
  ];

  return (
    <InfoCard
      title="Low Stock Items"
      link="/reports/low-stock"
      linkText="View All"
      Icon={Package}
      items={lowStock}
      columns={columns}
      renderBadge={(item) => (
        <Badge variant="destructive">
          {item.current_quantity} units
        </Badge>
      )}
    />
  )
}