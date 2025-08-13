"use client";

import { useState, useCallback, useMemo } from 'react';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductFiltersProps {
  search: string;
  setSearch: (v: string) => void;
  filters: {
    minPrice?: number;
    maxPrice?: number;
    brand?: string;
  };
  setFilters: (filters: {
    minPrice?: number;
    maxPrice?: number;
    brand?: string;
  }) => void;
  brands: string[];
}

export default function ProductFilters({ 
  search, 
  setSearch, 
  filters, 
  setFilters,
  brands
}: ProductFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, [setSearch]);

  const handleFilterChange = useCallback((key: string, value: string | number | undefined) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setFilters(localFilters);
  }, [localFilters, setFilters]);

  const clearFilters = useCallback(() => {
    setLocalFilters({});
    setFilters({});
  }, [setFilters]);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => value !== undefined && value !== '');
  }, [filters]);

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
      {/* Search Bar */}
      <div className="p-4 border-b border-neutral-200">
        <div className="relative">
          <Input
            placeholder="Search products by name, SKU, or brand"
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-10"
          />
          <svg 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="p-4 border-b border-neutral-200">
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          variant="ghost"
        >
          <FunnelIcon className="w-4 h-4 mr-2" />
          {isExpanded ? 'Hide Filters' : 'Show Filters'}
          {hasActiveFilters && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              Active
            </span>
          )}
        </Button>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 border-b border-neutral-200">
          <div className="space-y-4">
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Price Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={localFilters.minPrice || ''}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={localFilters.maxPrice || ''}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Brand
              </label>
              <Select value={localFilters.brand || ''} onValueChange={(v) => handleFilterChange('brand', v || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Brands</SelectItem>
                  {brands.map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Filter Actions */}
      {(isExpanded || hasActiveFilters) && (
        <div className="p-4 flex justify-between">
          <div>
            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="ghost"
              >
                <XMarkIcon className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            {isExpanded && (
              <Button
                onClick={applyFilters}
                
              >
                Apply Filters
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}