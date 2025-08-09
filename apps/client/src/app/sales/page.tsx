"use client";

import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';

export default function SalesPage() {
  const download = async () => {
    const params = new URLSearchParams();
    const url = `/api/sales/orders.csv?${params.toString()}`;
    window.location.href = url;
  };

  return (
    <DashboardLayout title="Sales">
      <button onClick={download} className="btn btn-primary">Download Sales CSV</button>
    </DashboardLayout>
  );
}
