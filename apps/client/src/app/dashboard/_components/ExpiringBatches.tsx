import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useRouter } from 'next/navigation';
import { ExpiringBatch } from '@/dashboard/types/types';
//need to import ExpiringBatch type from your types file
//should change this approach
interface Expiring {
     expiring: ExpiringBatch[];
}

export default function ExpiringBatches({expiring=[]}: Expiring) {
    const router=useRouter();
  return (
    <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-medium">
              Expiring Batches (30 days)
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/reports/expiring-batches")}
            >
              View All
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
                  {expiring.map((batch: any, index: number) => (
                    <TableRow key={index} className="hover:bg-muted/50">
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
