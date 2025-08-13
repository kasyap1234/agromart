import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExpiringBatch } from '@/app/dashboard/types/types';

interface Expiring {
     expiring: ExpiringBatch[];
}

export default function ExpiringBatches({expiring=[]}: Expiring) {
  return (
    <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-medium">
              Expiring Batches (30 days)
            </CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/reports/expiring-batches" aria-label="View all expiring batches">
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
                    <TableHead className="text-right">Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiring.map((batch: ExpiringBatch) => (
                    <TableRow key={batch.batch_number} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div>{batch.product_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Batch: {batch.batch_number}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            batch.days_until_expiry <= 7
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {batch.days_until_expiry} days
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {batch.quantity} units
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
