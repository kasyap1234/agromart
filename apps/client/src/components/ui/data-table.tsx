"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// Types following TypeScript best practices
export interface DataTableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => React.ReactNode;
  filterOptions?: Array<{ label: string; value: string | number | boolean }>;
  hidden?: boolean;
}

export interface DataTableAction<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: T) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: (row: T) => boolean;
  hidden?: (row: T) => boolean;
}

export interface DataTablePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  actions?: DataTableAction<T>[];
  pagination?: DataTablePagination;
  onPaginationChange?: (page: number, limit: number) => void;
  onSort?: (key: keyof T | string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  loading?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  showExport?: boolean;
  showRefresh?: boolean;
  showPagination?: boolean;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (rows: T[]) => void;
  getRowId?: (row: T) => string | number;
  className?: string;
}

// Constants moved outside component for performance
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  actions = [],
  pagination,
  onPaginationChange,
  onSort,
  onFilter,
  onSearch,
  onRefresh,
  onExport,
  loading = false,
  searchPlaceholder = "Search...",
  emptyMessage = "No data available",
  showSearch = true,
  showFilters = true,
  showExport = true,
  showRefresh = true,
  showPagination = true,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  getRowId = (row) => row.id || row.key,
  className,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Visible columns (excluding hidden ones)
  const visibleColumns = useMemo(() => 
    columns.filter(col => !col.hidden), 
    [columns]
  );

  // Filterable columns
  const filterableColumns = useMemo(() => 
    visibleColumns.filter(col => col.filterable && col.filterOptions), 
    [visibleColumns]
  );

  // Handle sorting
  const handleSort = useCallback((key: keyof T | string) => {
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  }, [sortKey, sortDirection, onSort]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  }, [onSearch]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    if (value === '' || value === null || value === undefined) {
      delete newFilters[key];
    }
    setFilters(newFilters);
    onFilter?.(newFilters);
  }, [filters, onFilter]);

  // Handle row selection
  const handleRowSelection = useCallback((row: T, checked: boolean) => {
    if (!onSelectionChange) return;
    
    const rowId = getRowId(row);
    const currentSelected = selectedRows || [];
    
    if (checked) {
      const newSelected = [...currentSelected, row];
      onSelectionChange(newSelected);
    } else {
      const newSelected = currentSelected.filter(r => getRowId(r) !== rowId);
      onSelectionChange(newSelected);
    }
  }, [selectedRows, onSelectionChange, getRowId]);

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange(data);
    } else {
      onSelectionChange([]);
    }
  }, [data, onSelectionChange]);

  // Check if row is selected
  const isRowSelected = useCallback((row: T) => {
    const rowId = getRowId(row);
    return selectedRows?.some(r => getRowId(r) === rowId) || false;
  }, [selectedRows, getRowId]);

  // Check if all rows are selected
  const allRowsSelected = useMemo(() => {
    return data.length > 0 && data.every(row => isRowSelected(row));
  }, [data, isRowSelected]);

  // Check if some rows are selected
  const someRowsSelected = useMemo(() => {
    return selectedRows && selectedRows.length > 0 && !allRowsSelected;
  }, [selectedRows, allRowsSelected]);

  // Render sort icon
  const renderSortIcon = useCallback((key: keyof T | string) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="ml-2 h-4 w-4" />
      : <ChevronDown className="ml-2 h-4 w-4" />;
  }, [sortKey, sortDirection]);

  // Render cell content
  const renderCellContent = useCallback((column: DataTableColumn<T>, row: T, index: number) => {
    const value = typeof column.key === 'string' 
      ? row[column.key as keyof T] 
      : undefined;
    
    if (column.render) {
      return column.render(value, row, index);
    }
    
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">—</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    }
    
    return String(value);
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with search, filters, and actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          {showSearch && (
            <div className="relative max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          )}
          
          {showFilters && filterableColumns.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {Object.keys(filters).length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1 text-xs">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          )}
          
          {showExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFiltersPanel && filterableColumns.length > 0 && (
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterableColumns.map((column) => (
              <div key={String(column.key)} className="space-y-2">
                <label className="text-sm font-medium">{column.label}</label>
                <Select
                  value={filters[String(column.key)] || ''}
                  onValueChange={(value) => handleFilterChange(String(column.key), value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Filter by ${column.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {column.filterOptions?.map((option) => (
                      <SelectItem key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selection info */}
      {selectable && selectedRows && selectedRows.length > 0 && (
        <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedRows.length} of {data.length} row(s) selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectionChange?.([])}
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Data Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allRowsSelected}
                    onCheckedChange={handleSelectAll}
                    indeterminate={someRowsSelected}
                  />
                </TableHead>
              )}
              {visibleColumns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={cn(
                    column.width && `w-[${column.width}]`,
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer select-none'
                  )}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}
              {actions.length > 0 && (
                <TableHead className="w-12">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell 
                  colSpan={visibleColumns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="text-center py-8"
                >
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <div>Loading...</div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={visibleColumns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="text-center py-8 text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={getRowId(row)} className="hover:bg-muted/50">
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={isRowSelected(row)}
                        onCheckedChange={(checked) => handleRowSelection(row, checked as boolean)}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={String(column.key)}
                      className={cn(
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {renderCellContent(column, row, index)}
                    </TableCell>
                  ))}
                  {actions.length > 0 && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions.map((action, actionIndex) => {
                            const isHidden = action.hidden?.(row) || false;
                            const isDisabled = action.disabled?.(row) || false;
                            
                            if (isHidden) return null;
                            
                            return (
                              <DropdownMenuItem
                                key={actionIndex}
                                onClick={() => action.onClick(row)}
                                disabled={isDisabled}
                                className="cursor-pointer"
                              >
                                {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                                {action.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && pagination && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select
                value={String(pagination.limit)}
                onValueChange={(value) => onPaginationChange?.(1, parseInt(value))}
              >
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPaginationChange?.(1, pagination.limit)}
                disabled={pagination.page <= 1}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPaginationChange?.(pagination.page - 1, pagination.limit)}
                disabled={pagination.page <= 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="mx-4 text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPaginationChange?.(pagination.page + 1, pagination.limit)}
                disabled={pagination.page >= pagination.totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPaginationChange?.(pagination.totalPages, pagination.limit)}
                disabled={pagination.page >= pagination.totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export common action helpers
export const defaultActions = {
  view: (onView: (row: any) => void): DataTableAction<any> => ({
    label: 'View',
    icon: Eye,
    onClick: onView,
  }),
  edit: (onEdit: (row: any) => void): DataTableAction<any> => ({
    label: 'Edit',
    icon: Edit,
    onClick: onEdit,
  }),
  delete: (onDelete: (row: any) => void): DataTableAction<any> => ({
    label: 'Delete',
    icon: Trash2,
    onClick: onDelete,
    variant: 'destructive' as const,
  }),
};