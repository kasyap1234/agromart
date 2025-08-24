import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface InfoCardProps<T> {
  title: string;
  link: string;
  linkText: string;
  Icon: LucideIcon;
  items: T[];
  columns: {
    header: string;
    accessor: keyof T;
  }[];
  renderBadge?: (item: T) => React.ReactNode;
}

export default function InfoCard<T>({ title, link, linkText, Icon, items, columns, renderBadge }: InfoCardProps<T>) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href={link as any} aria-label={linkText}>
            {linkText}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={String(column.accessor)}>{column.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  {columns.map((column) => (
                    <TableCell key={String(column.accessor)} className="font-medium">
                      {item[column.accessor] as React.ReactNode}
                    </TableCell>
                  ))}
                  {renderBadge && <TableCell className="text-right">{renderBadge(item)}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Icon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No {title.toLowerCase()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}