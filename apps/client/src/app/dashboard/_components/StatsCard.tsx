import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { statsCardVariants } from "@/components/ui/stats-card";
import { cva } from "class-variance-authority";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "primary" | "secondary" | "success" | "warning" | "error";
  className?: string;
}

export default function StatsCard({ title, value, icon: Icon, color, className }: StatsCardProps) {
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </CardTitle>
        <div className={cn(statsCardVariants({ color }))}>
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
