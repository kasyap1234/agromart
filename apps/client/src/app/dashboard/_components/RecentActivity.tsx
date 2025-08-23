import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, ArrowUp, FileText } from 'lucide-react';
import { formatRelativeTime } from '@/lib/date';
import { InventoryLog } from '@/types';

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

    const getActivityIcon = (activityType: string) => {
        switch (activityType) {
            case 'product_added':
                return <Plus className="w-4 h-4" aria-hidden="true" />;
            case 'inventory_updated':
                return <ArrowUp className="w-4 h-4" aria-hidden="true" />;
            case 'order_created':
                return <FileText className="w-4 h-4" aria-hidden="true" />;
            default:
                return <ArrowUp className="w-4 h-4" aria-hidden="true" />;
        }
    };

    const getActivityDescription = (log: InventoryLog) => {
        const productName = log.product_name || 'Unknown Product';
        const batchNumber = log.batch_number ? ` (Batch: ${log.batch_number})` : '';
        const quantity = Math.abs(log.quantity_change);
        
        switch (log.transaction_type.toLowerCase()) {
            case 'add':
                return `Added ${quantity} units of ${productName}${batchNumber}`;
            case 'reduce':
                return `Removed ${quantity} units of ${productName}${batchNumber}`;
            default:
                return `${log.transaction_type} transaction for ${productName}${batchNumber}`;
        }
    };

    const getActivityColorClass = (activityType: string) => {
        switch (activityType) {
            case 'product_added':
                return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
            case 'inventory_updated':
                return 'bg-primary/10 text-primary';
            case 'order_created':
                return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
            default:
                return 'bg-primary/10 text-primary';
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
                            return (
                                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColorClass(activityType)}`}>
                                            {getActivityIcon(activityType)}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">
                                            {getActivityDescription(log)}
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