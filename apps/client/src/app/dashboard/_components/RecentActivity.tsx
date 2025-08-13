import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, ArrowUp, FileText } from 'lucide-react';
import { formatDate } from '@/lib/date';
import type { recentActivity } from '@/dashboard/types/types';

interface Props {
    recentActivity: recentActivity[];
}
export default function RecentActivity({recentActivity=[]}: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                                {activity.type === "product_added" && (
                                    <div className="bg-success-500/10 text-success-500 w-8 h-8 rounded-full flex items-center justify-center">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                )}
                                {activity.type === "inventory_updated" && (
                                    <div className="bg-primary-500/10 text-primary-500 w-8 h-8 rounded-full flex items-center justify-center">
                                        <ArrowUp className="w-4 h-4" />
                                    </div>
                                )}
                                {activity.type === "order_created" && (
                                    <div className="bg-orange-500/10 text-orange-500 w-8 h-8 rounded-full flex items-center justify-center">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">
                                    {activity.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDate(activity.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
