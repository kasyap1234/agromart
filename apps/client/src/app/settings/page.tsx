"use client";

import DashboardLayout from '@/components/layout/DashboardLayout';

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings">
      <div className="space-y-4">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Profile</h3>
          </div>
          <div className="card-body">
            <p className="text-neutral-600">Settings page scaffold.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
