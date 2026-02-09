/* ============================================================
   Project Intelligence Platform - Data Table
   Reusable table with sorting, pagination, loading, empty states,
   and row click handling.
   ============================================================ */

import React, { useState, useMemo, useCallback } from 'react';

// ─── Column Definition ───────────────────────────────────────

export interface ColumnDef<T> {
  /** Unique key for the column */
  key: string;
  /** Header text */
  header: string;
  /** Property accessor - dot notation supported (e.g., 'client.name') */
  accessor?: string;
  /** Custom render function */
  render?: (row: T, index: number) => React.ReactNode;
  /** Enable sorting on this column. Default: true if accessor is provided */
  sortable?: boolean;
  /** Column width (Tailwind class, e.g. 'w-48') */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Hide on mobile */
  hideOnMobile?: boolean;
}

// ─── Sort State ──────────────────────────────────────────────

type SortDirection = 'asc' | 'desc';

interface SortState {
  column: string;
  direction: SortDirection;
}

// ─── Props ───────────────────────────────────────────────────

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  /** Unique key extractor for each row */
  keyExtractor: (row: T, index: number) => string;
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Show loading skeleton */
  isLoading?: boolean;
  /** Number of skeleton rows to show when loading */
  loadingRows?: number;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Custom empty state component */
  emptyComponent?: React.ReactNode;
  /** Enable pagination. If false, all rows shown. */
  paginated?: boolean;
  /** Rows per page options */
  pageSizeOptions?: number[];
  /** Default rows per page */
  defaultPageSize?: number;
  /** External page (for server-side pagination) */
  page?: number;
  /** External total (for server-side pagination) */
  total?: number;
  /** External page change handler (for server-side pagination) */
  onPageChange?: (page: number, pageSize: number) => void;
  /** Compact mode with smaller padding */
  compact?: boolean;
  /** Striped rows */
  striped?: boolean;
  /** Additional CSS class for the table container */
  className?: string;
}

// ─── Utility: deep get ───────────────────────────────────────

function deepGet(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ─── Component ───────────────────────────────────────────────

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading = false,
  loadingRows = 5,
  emptyMessage = 'No data available.',
  emptyComponent,
  paginated = true,
  pageSizeOptions = [10, 25, 50],
  defaultPageSize = 10,
  page: externalPage,
  total: externalTotal,
  onPageChange,
  compact = false,
  striped = false,
  className = '',
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [internalPage, setInternalPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const isServerPaginated = externalPage !== undefined && onPageChange !== undefined;
  const currentPage = isServerPaginated ? externalPage : internalPage;

  // ── Sorting ────
  const sortedData = useMemo(() => {
    if (!sort || isServerPaginated) return data;

    const col = columns.find((c) => c.key === sort.column);
    if (!col) return data;

    return [...data].sort((a, b) => {
      const accessor = col.accessor || col.key;
      const aVal = deepGet(a, accessor);
      const bVal = deepGet(b, accessor);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sort, columns, isServerPaginated]);

  // ── Pagination ────
  const totalItems = isServerPaginated ? (externalTotal || 0) : sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedData = useMemo(() => {
    if (!paginated || isServerPaginated) return sortedData;
    const start = (internalPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, paginated, isServerPaginated, internalPage, pageSize]);

  const handleSort = useCallback((columnKey: string) => {
    setSort((prev) => {
      if (prev?.column === columnKey) {
        if (prev.direction === 'asc') return { column: columnKey, direction: 'desc' };
        return null; // Remove sort
      }
      return { column: columnKey, direction: 'asc' };
    });
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, totalPages));
      if (isServerPaginated && onPageChange) {
        onPageChange(clamped, pageSize);
      } else {
        setInternalPage(clamped);
      }
    },
    [totalPages, isServerPaginated, onPageChange, pageSize]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      if (isServerPaginated && onPageChange) {
        onPageChange(1, newSize);
      } else {
        setInternalPage(1);
      }
    },
    [isServerPaginated, onPageChange]
  );

  // ── Cell padding ────
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  const headerPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  // ── Alignment class ────
  const alignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  // ── Sort icon ────
  const renderSortIcon = (columnKey: string) => {
    if (sort?.column !== columnKey) {
      return (
        <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    if (sort.direction === 'asc') {
      return (
        <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    return (
      <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // ── Loading skeleton ────
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-slate-200 overflow-hidden ${className}`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`${headerPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider ${alignClass(col.align)} ${col.width || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: loadingRows }).map((_, rowIdx) => (
                <tr key={rowIdx} className="border-b border-slate-100">
                  {columns.map((col) => (
                    <td key={col.key} className={cellPadding}>
                      <div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Empty state ────
  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-slate-200 overflow-hidden ${className}`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`${headerPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider ${alignClass(col.align)} ${col.width || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-4">
          {emptyComponent || (
            <>
              <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm text-slate-500">{emptyMessage}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Table rendering ────
  return (
    <div className={`bg-white rounded-lg border border-slate-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col) => {
                const isSortable = col.sortable !== false && (col.accessor || col.sortable);
                return (
                  <th
                    key={col.key}
                    className={`
                      ${headerPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider
                      ${alignClass(col.align)} ${col.width || ''}
                      ${col.hideOnMobile ? 'hidden md:table-cell' : ''}
                      ${isSortable ? 'cursor-pointer select-none hover:text-slate-700' : ''}
                    `}
                    onClick={isSortable ? () => handleSort(col.key) : undefined}
                  >
                    <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                      <span>{col.header}</span>
                      {isSortable && renderSortIcon(col.key)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIdx) => (
              <tr
                key={keyExtractor(row, rowIdx)}
                className={`
                  border-b border-slate-100 last:border-b-0 transition-colors duration-100
                  ${onRowClick ? 'cursor-pointer hover:bg-indigo-50/50' : 'hover:bg-slate-50'}
                  ${striped && rowIdx % 2 === 1 ? 'bg-slate-50/50' : ''}
                `}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col, colIdx) => {
                  const cellContent = col.render
                    ? col.render(row, rowIdx)
                    : col.accessor
                    ? String(deepGet(row, col.accessor) ?? '')
                    : '';

                  return (
                    <td
                      key={col.key}
                      className={`
                        ${cellPadding} text-sm
                        ${colIdx === 0 ? 'font-medium text-slate-900' : 'text-slate-700'}
                        ${alignClass(col.align)}
                        ${col.hideOnMobile ? 'hidden md:table-cell' : ''}
                      `}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border border-slate-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="hidden sm:inline">
              {(currentPage - 1) * pageSize + 1}
              {' - '}
              {Math.min(currentPage * pageSize, totalItems)}
              {' of '}
              {totalItems}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="First page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="px-3 py-1 text-sm text-slate-700 font-medium">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Last page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
