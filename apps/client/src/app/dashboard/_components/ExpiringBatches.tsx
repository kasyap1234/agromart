import React from 'react'
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { ExpiringBatch } from '@/app/dashboard/types/types';
import { formatDate } from '@/lib/date';

interface Props {
  expiring?: ExpiringBatch[];
}

export default function ExpiringBatches({ expiring = [] }: Props) {
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-medium">
          Expiring Batches
        </CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href="/batches" aria-label="View all batches">
            View All
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {expiring.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiring.map((batch: ExpiringBatch) => (
                <TableRow key={batch.batch_id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div>{batch.product_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Batch: {batch.batch_number}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getBadgeVariant(batch.days_until_expiry)}>
                      {getExpiryText(batch.days_until_expiry)}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(batch.expiry_date)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-6">
            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No expiring batches
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}