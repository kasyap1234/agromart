import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { formatRelativeTime } from '@/lib/date';
import { InventoryLog } from '@/types';
import { activityVariants } from './activity-variants';

interface Props {
    recentActivity: InventoryLog[];
}

export default function RecentActivity({recentActivity=[]}: Props) {
    const getActivityType = (transactionType: string) => {
        switch (transactionType.toLowerCase()) {
            case 'add':
                return 'product_added';
            case 'reduce':
                return 'inventory_updated';
            case 'order':
                return 'order_created';
            default:
                return 'inventory_updated';
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                {recentActivity.length > 0 ? (
                    <div className="space-y-4">
                        {recentActivity.map((log) => {
                            const activityType = getActivityType(log.transaction_type);
                            const variant = activityVariants[activityType as keyof typeof activityVariants] || activityVariants.inventory_updated;
                            const Icon = variant.icon;
                            return (
                                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${variant.color}`}>
                                            <Icon className="w-4 h-4" aria-hidden="true" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">
                                            {variant.description(log)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatRelativeTime(log.created_at)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">
                            No recent activity
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}