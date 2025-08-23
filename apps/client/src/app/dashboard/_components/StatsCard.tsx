import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "primary" | "secondary" | "success" | "warning" | "error";
  className?: string;
}

const colorClasses = {
  primary: "text-primary-600 bg-gradient-to-br from-primary-100 to-primary-200 dark:text-primary-400 dark:from-primary-900/50 dark:to-primary-800/50 border-primary-200 dark:border-primary-800/50",
  secondary: "text-secondary-600 bg-gradient-to-br from-secondary-100 to-secondary-200 dark:text-secondary-400 dark:from-secondary-900/50 dark:to-secondary-800/50 border-secondary-200 dark:border-secondary-800/50",
  success: "text-green-600 bg-gradient-to-br from-green-100 to-green-200 dark:text-green-400 dark:from-green-900/50 dark:to-green-800/50 border-green-200 dark:border-green-800/50",
  warning: "text-orange-600 bg-gradient-to-br from-orange-100 to-orange-200 dark:text-orange-400 dark:from-orange-900/50 dark:to-orange-800/50 border-orange-200 dark:border-orange-800/50",
  error: "text-red-600 bg-gradient-to-br from-red-100 to-red-200 dark:text-red-400 dark:from-red-900/50 dark:to-red-800/50 border-red-200 dark:border-red-800/50",
};

export default function StatsCard({ title, value, icon: Icon, color = "primary", className }: StatsCardProps) {
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </CardTitle>
        <div className={cn(
          "w-12 h-12 flex items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm group-hover:shadow-md",
          colorClasses[color]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="text-3xl font-bold tracking-tight group-hover:scale-105 transition-transform duration-300">
          {value}
        </div>
      </CardContent>
      {/* Subtle background decoration */}
      <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-2xl group-hover:from-primary/10 transition-all duration-300"></div>
    </Card>
  );
}
