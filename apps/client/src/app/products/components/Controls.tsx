"use client";

import { useCallback, useMemo } from 'react';

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
      <input
        placeholder="Search products by name or SKU"
        value={search}
        onChange={onChange}
        className="input w-full sm:w-80"
      />
      <div className="flex items-center gap-2">
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="input w-24">
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>{n}/page</option>
          ))}
        </select>
        <button onClick={dec} className="btn">Prev</button>
        <span className="text-sm text-neutral-600">{pageInfo}</span>
        <button onClick={inc} className="btn">Next</button>
      </div>
    </div>
  );
}
