"use client";

import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ControlsProps {
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
  limit: number;
  setLimit: (v: number) => void;
}

export default function Controls({ search, setSearch, page, setPage, limit, setLimit }: ControlsProps) {
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), [setSearch]);
  const inc = useCallback(() => setPage(page + 1), [page, setPage]);
  const dec = useCallback(() => setPage(Math.max(1, page - 1)), [page, setPage]);
  const pageInfo = useMemo(() => `Page ${page}`, [page]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Input
        placeholder="Search products by name or SKU"
        value={search}
        onChange={onChange}
        className="w-full sm:w-80"
      />
      <div className="flex items-center gap-2">
        <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[10, 20, 50].map((n) => (
              <SelectItem key={n} value={String(n)}>{n}/page</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={dec} variant="outline">Prev</Button>
        <span className="text-sm text-neutral-600">{pageInfo}</span>
        <Button onClick={inc} variant="outline">Next</Button>
      </div>
    </div>
  );
}
