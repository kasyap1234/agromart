"use client";

import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function ReportsPage() {
  return (
    <DashboardLayout title="Reports">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/reports/low-stock" className="card p-4 hover:shadow">
          <h3 className="text-lg font-medium">Low Stock</h3>
          <p className="text-sm text-neutral-600">Items below minimum stock level</p>
        </Link>
        <Link href="/reports/expiring-batches" className="card p-4 hover:shadow">
          <h3 className="text-lg font-medium">Expiring Batches</h3>
          <p className="text-sm text-neutral-600">Batches expiring soon</p>
        </Link>
      </div>
    </DashboardLayout>
  );
}
