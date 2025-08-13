import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, ArrowUp, FileText } from 'lucide-react'

export default function QuickActions() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-3">
                    <Button asChild className="justify-start h-16 rounded-lg">
                        <Link href="/products/new" aria-label="Add product">
                            <div className="bg-primary-500/10 text-primary-500 w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                                <Plus className="w-5 h-5" aria-hidden="true" />
                            </div>
                            <div className="text-left">
                                <div className="font-medium">Add Product</div>
                                <div className="text-xs text-muted-foreground">
                                    Create a new product
                                </div>
                            </div>
                        </Link>
                    </Button>

                    <Button asChild variant="outline" className="justify-start h-16 rounded-lg">
                        <Link href="/inventory" aria-label="Add inventory">
                            <div className="bg-primary-500/10 text-primary-500 w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                                <ArrowUp className="w-5 h-5" aria-hidden="true" />
                            </div>
                            <div className="text-left">
                                <div className="font-medium">Add Inventory</div>
                                <div className="text-xs text-muted-foreground">
                                    Increase stock levels
                                </div>
                            </div>
                        </Link>
                    </Button>

                    <Button asChild variant="outline" className="justify-start h-16 rounded-lg">
                        <Link href="/purchase-orders" aria-label="Create purchase order">
                            <div className="bg-primary-500/10 text-primary-500 w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                                <FileText className="w-5 h-5" aria-hidden="true" />
                            </div>
                            <div className="text-left">
                                <div className="font-medium">Create Purchase Order</div>
                                <div className="text-xs text-muted-foreground">
                                    Order products from suppliers
                                </div>
                            </div>
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
