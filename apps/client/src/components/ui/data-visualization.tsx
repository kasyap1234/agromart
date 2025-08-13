'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeType = 'neutral',
  trend = 'neutral',
  subtitle,
  className
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-md', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {getTrendIcon()}
            {change !== undefined && (
              <span className={cn('text-sm font-medium', getChangeColor())}>
                {change > 0 ? '+' : ''}{change}%
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProgressCardProps {
  title: string;
  value: number;
  max: number;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  className?: string;
}

export function ProgressCard({
  title,
  value,
  max,
  label,
  variant = 'default',
  className
}: ProgressCardProps) {
  const percentage = Math.round((value / max) * 100);
  
  const getProgressColor = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'destructive':
        return 'bg-red-500';
      default:
        return 'bg-primary';
    }
  };

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-md', className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <Badge variant="outline">{percentage}%</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{value}</span>
              <span className="text-muted-foreground">of {max}</span>
            </div>
            <Progress value={percentage} className="h-2" />
            {label && (
              <p className="text-xs text-muted-foreground">{label}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SimpleChartProps {
  title: string;
  data: Array<{ label: string; value: number; color?: string }>;
  className?: string;
}

export function SimpleBarChart({ title, data, className }: SimpleChartProps) {
  const maxValue = Math.max(...data.map(item => item.value));

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-md', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => {
            const percentage = (item.value / maxValue) * 100;
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">{item.value}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all duration-500',
                      item.color || 'bg-primary'
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'error';
  label: string;
  description?: string;
  className?: string;
}

export function StatusIndicator({
  status,
  label,
  description,
  className
}: StatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'warning':
        return 'Warning';
      case 'error':
        return 'Error';
      default:
        return 'Offline';
    }
  };

  return (
    <div className={cn('flex items-center space-x-3', className)}>
      <div className="flex items-center space-x-2">
        <div className={cn('w-2 h-2 rounded-full', getStatusColor())} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Badge variant="outline" className="text-xs">
        {getStatusText()}
      </Badge>
      {description && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
    </div>
  );
}