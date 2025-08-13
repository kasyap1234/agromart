import React from 'react'
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { LowStockItem } from '@/dashboard/types/types';

interface Props {
  lowStock?: LowStockItem[];
}

export default function LowStockItems({lowStock=[]}:Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-medium">
          Low Stock Items
        </CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href="/reports/low-stock" aria-label="View all low stock items">
            View All
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {lowStock.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStock.map((item: LowStockItem) => (
                <TableRow key={item.product_sku} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div>{item.product_name}</div>
                    <div className="text-sm text-muted-foreground">
                      SKU: {item.product_sku}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive">
                      {item.current_quantity} units
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Min: {item.min_stock_level}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-6">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No low stock items
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
