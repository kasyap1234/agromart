
import React from 'react';

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
}

export const DetailItem = React.memo(function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
});
