import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-neutral-200 rounded-full skeleton"></div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-neutral-200 rounded skeleton mb-2"></div>
                  <div className="h-8 bg-neutral-200 rounded skeleton"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="h-6 bg-neutral-200 rounded skeleton w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 bg-neutral-200 rounded skeleton w-32"></div>
                  <div className="h-4 bg-neutral-200 rounded skeleton w-16"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-6 bg-neutral-200 rounded skeleton w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 bg-neutral-200 rounded skeleton w-32"></div>
                  <div className="h-4 bg-neutral-200 rounded skeleton w-20"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="h-6 bg-neutral-200 rounded skeleton w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center p-4 bg-neutral-50 rounded-lg"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-neutral-200 rounded skeleton"></div>
                </div>
                <div className="ml-3">
                  <div className="h-4 bg-neutral-200 rounded skeleton w-20 mb-1"></div>
                  <div className="h-3 bg-neutral-200 rounded skeleton w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
