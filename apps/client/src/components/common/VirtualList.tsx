'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  onEndReached?: () => void;
  endThreshold?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onEndReached,
  endThreshold = 0.8,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
    const end = Math.min(items.length, start + visibleCount);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Check if we've reached the end
  useEffect(() => {
    if (onEndReached && visibleRange.end >= items.length * endThreshold) {
      onEndReached();
    }
  }, [visibleRange.end, items.length, onEndReached, endThreshold]);

  // Render visible items
  const visibleItems = useMemo(() => {
    const itemsToRender: Array<{ item: T; index: number; top: number }> = [];

    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      if (i < items.length) {
        itemsToRender.push({
          item: items[i]!,
          index: i,
          top: i * itemHeight,
        });
      }
    }

    return itemsToRender;
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Enhanced virtual list with dynamic item heights
interface DynamicVirtualListProps<T> {
  items: T[];
  estimatedItemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number, measureRef: (el: HTMLElement | null) => void) => React.ReactNode;
  className?: string;
  overscan?: number;
  onEndReached?: () => void;
  endThreshold?: number;
}

export function DynamicVirtualList<T>({
  items,
  estimatedItemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onEndReached,
  endThreshold = 0.8,
}: DynamicVirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure item height
  const measureRef = useCallback((index: number) => (el: HTMLElement | null) => {
    if (el && !measuredHeights.has(index)) {
      const height = el.offsetHeight;
      setMeasuredHeights(prev => new Map(prev).set(index, height));
    }
  }, [measuredHeights]);

  // Get item height (measured or estimated)
  const getItemHeight = useCallback((index: number) => {
    return measuredHeights.get(index) ?? estimatedItemHeight;
  }, [measuredHeights, estimatedItemHeight]);

  // Calculate cumulative heights
  const { cumulativeHeights, totalHeight } = useMemo(() => {
    const heights = new Array(items.length);
    const cumulative = new Array(items.length + 1).fill(0);

    for (let i = 0; i < items.length; i++) {
      heights[i] = getItemHeight(i);
      cumulative[i + 1] = cumulative[i] + heights[i];
    }

    return { cumulativeHeights: cumulative, totalHeight: cumulative[items.length] };
  }, [items.length, getItemHeight]);

  // Find visible range using binary search
  const visibleRange = useMemo(() => {
    // Binary search to find start index
    const findStartIndex = (target: number) => {
      let low = 0;
      let high = items.length;

      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (cumulativeHeights[mid] < target) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }

      return Math.max(0, low - overscan);
    };

    // Find end index
    const findEndIndex = (start: number, target: number) => {
      let currentHeight = cumulativeHeights[start];
      let index = start;

      while (index < items.length && currentHeight < target + containerHeight) {
        currentHeight += getItemHeight(index);
        index++;
      }

      return Math.min(items.length, index + overscan);
    };

    const start = findStartIndex(scrollTop);
    const end = findEndIndex(start, scrollTop);

    return { start, end };
  }, [scrollTop, containerHeight, cumulativeHeights, items.length, overscan, getItemHeight]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Check if we've reached the end
  useEffect(() => {
    if (onEndReached && visibleRange.end >= items.length * endThreshold) {
      onEndReached();
    }
  }, [visibleRange.end, items.length, onEndReached, endThreshold]);

  // Render visible items
  const visibleItems = useMemo(() => {
    const itemsToRender: Array<{ item: T; index: number; top: number }> = [];

    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      if (i < items.length) {
        itemsToRender.push({
          item: items[i]!,
          index: i,
          top: cumulativeHeights[i],
        });
      }
    }

    return itemsToRender;
  }, [items, visibleRange, cumulativeHeights]);

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: getItemHeight(index),
            }}
          >
            {renderItem(item, index, measureRef(index))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Optimized grid virtual list
interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  gap?: number;
  overscan?: number;
  onEndReached?: () => void;
  endThreshold?: number;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  className,
  gap = 8,
  overscan = 5,
  onEndReached,
  endThreshold = 0.8,
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate grid dimensions
  const gridDimensions = useMemo(() => {
    const columns = Math.floor((containerWidth + gap) / (itemWidth + gap));
    const rows = Math.ceil(items.length / columns);

    return { columns: Math.max(1, columns), rows };
  }, [containerWidth, itemWidth, gap, items.length]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const rowHeight = itemHeight + gap;
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endRow = Math.min(
      gridDimensions.rows,
      startRow + Math.ceil(containerHeight / rowHeight) + 2 * overscan
    );

    const colWidth = itemWidth + gap;
    const startCol = Math.max(0, Math.floor(scrollLeft / colWidth) - overscan);
    const endCol = Math.min(
      gridDimensions.columns,
      startCol + Math.ceil(containerWidth / colWidth) + 2 * overscan
    );

    return { startRow, endRow, startCol, endCol };
  }, [scrollTop, scrollLeft, containerHeight, containerWidth, itemHeight, itemWidth, gap, overscan, gridDimensions]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  // Check if we've reached the end
  useEffect(() => {
    const lastVisibleIndex = visibleRange.endRow * gridDimensions.columns + visibleRange.endCol;
    if (onEndReached && lastVisibleIndex >= items.length * endThreshold) {
      onEndReached();
    }
  }, [visibleRange, gridDimensions, items.length, onEndReached, endThreshold]);

  // Render visible items
  const visibleItems = useMemo(() => {
    const itemsToRender: Array<{ item: T; index: number; top: number; left: number }> = [];

    for (let row = visibleRange.startRow; row < visibleRange.endRow; row++) {
      for (let col = visibleRange.startCol; col < visibleRange.endCol; col++) {
        const index = row * gridDimensions.columns + col;
        if (index < items.length) {
          itemsToRender.push({
            item: items[index]!,
            index,
            top: row * (itemHeight + gap),
            left: col * (itemWidth + gap),
          });
        }
      }
    }

    return itemsToRender;
  }, [items, visibleRange, gridDimensions, itemHeight, itemWidth, gap]);

  const totalHeight = gridDimensions.rows * (itemHeight + gap);
  const totalWidth = gridDimensions.columns * (itemWidth + gap);

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight, width: containerWidth }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, width: totalWidth, position: 'relative' }}>
        {visibleItems.map(({ item, index, top, left }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top,
              left,
              width: itemWidth,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}