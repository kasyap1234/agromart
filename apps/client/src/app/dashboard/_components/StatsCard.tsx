import React from "react";
import { StatsCardProps } from "@/app/dashboard/types/types";
import { Card, CardContent } from "@/components/ui/card";

export default function StatsCard({
    title,
    value,
    icon:Icon,
    color="primary",
}: StatsCardProps) {
  const colorClasses = {
    primary: "from-blue-50 to-blue-100 border-blue-200 text-blue-900",
    warning: "from-amber-50 to-amber-100 border-amber-200 text-amber-900",
    error: "from-rose-50 to-rose-100 border-rose-200 text-rose-900",
    success:
      "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900",
  };

  const iconColorClasses = {
    primary: "text-blue-600",
    warning: "text-amber-600",
    error: "text-rose-600",
    success: "text-emerald-600",
  };

  return (
    <Card className={`border bg-gradient-to-br ${colorClasses[color]}`}>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`w-8 h-8 ${iconColorClasses[color]}`} />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}