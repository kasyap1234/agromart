import React from 'react'
import { Clock } from 'lucide-react';
import { ExpiringBatch } from '@/app/dashboard/types/types';
import InfoCard from './InfoCard';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date';

interface Props {
  expiring?: ExpiringBatch[];
}

export default function ExpiringBatches({ expiring = [] }: Props) {
  const columns = [
    {
      header: 'Product',
      accessor: 'product_name' as const,
    },
  ];

  const getBadgeVariant = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 0) return 'destructive';
    if (daysUntilExpiry <= 7) return 'destructive';
    if (daysUntilExpiry <= 30) return 'secondary';
    return 'outline';
  };

  const getExpiryText = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 0) return 'Expired';
    if (daysUntilExpiry === 1) return '1 day';
    return `${daysUntilExpiry} days`;
  };

  return (
    <InfoCard
      title="Expiring Batches"
      link="/batches"
      linkText="View All"
      Icon={Clock}
      items={expiring}
      columns={columns}
      renderBadge={(item) => (
        <Badge variant={getBadgeVariant(item.days_until_expiry)}>
          {getExpiryText(item.days_until_expiry)}
        </Badge>
      )}
    />
  )
}