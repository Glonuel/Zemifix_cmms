'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

interface AuditRecord {
  id: string;
  sequenceNumber: string | number;
  actorUserId?: string | null;
  actorUser?: { name?: string; email?: string } | null;
  action: string;
  resource: string;
  resourceId: string;
  payload: unknown;
  prevHash: string;
  hash: string;
  createdAt: string;
}

interface AuditResponse {
  logs?: AuditRecord[];
  data?: AuditRecord[];
  pagination?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
  integrity?: {
    valid: boolean;
    brokenAtSequence?: string | number;
  };
  error?: string;
  message?: string;
}

const inputClass =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-[#FF5B00] focus:outline-none focus:ring-1 focus:ring-[#FF5B00]';

export default function AuditLogPanel() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [search, setSearch] = useState('');
  const [resource, setResource] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [integrity, setIntegrity] = useState<AuditResponse['integrity']>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setApiUnavailable(false);
    setIntegrity(undefined);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      });

      if (search.trim()) params.set('search', search.trim());
      if (resource) params.set('resource', resource);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        cache: 'no-store',
      });

      if (response.status === 404 || response.status === 405) {
        setApiUnavailable(true);
        setRecords([]);
        return;
      }

      const result: AuditResponse = await response.json();

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          response.status === 401
            ? 'Please sign in to view audit records.'
            : 'Your account does not have permission to read audit records.'
        );
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Unable to load audit records.');
      }

      const rows = result.logs ?? result.data ?? [];
      setRecords(rows);
      setTotal(result.pagination?.total ?? rows.length);
      setTotalPages(Math.max(1, result.pagination?.totalPages ?? 1));
      setIntegrity(result.integrity);
    } catch (err) {
      setRecords([]);
      setError(err instanceof Error ? err.message : 'Unable to load audit records.');
    } finally {
      setLoading(false);
    }
  }, [page, search, resource, fromDate, toDate]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAuditLogs();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [loadAuditLogs]);

  useEffect(() => {
    setPage(1);
  }, [search, resource, fromDate, toDate]);

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const actorName = (record: AuditRecord) =>
    record.actorUser?.name ||
    record.actorUser?.email ||
    record.actorUserId ||
    'System';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#0B1336]">Audit Trail</h3>
            <p className="mt-1 text-xs text-slate-500">
              Read-only history of recorded system changes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAuditLogs()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit records..."
              className={`${inputClass} w-full pl-9`}
            />
          </div>

          <select
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            className={inputClass}
          >
            <option value="">All resources</option>
            <option value="asset">Assets</option>
            <option value="work_order">Work orders</option>
            <option value="invoice">Invoices</option>
            <option value="customer">Customers</option>
            <option value="user">Users</option>
          </select>

          <input
            type="date"
            aria-label="From date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={inputClass}
          />

          <input
            type="date"
            aria-label="To date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={fromDate || undefined}
            className={inputClass}
          />
        </div>
      </div>

      {integrity && (
        <div className={`flex items-start gap-3 rounded-xl border p-3 ${
          integrity.valid
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-rose-200 bg-rose-50'
        }`}>
          {integrity.valid
            ? <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
            : <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600" />}
          <div>
            <p className={`text-xs font-bold ${
              integrity.valid ? 'text-emerald-800' : 'text-rose-800'
            }`}>
              {integrity.valid ? 'Audit chain verified' : 'Audit chain integrity failure'}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {integrity.valid
                ? 'The verification result supplied by the server reports a valid audit chain.'
                : `The server reports a problem at sequence ${integrity.brokenAtSequence ?? 'unknown'}.`}
            </p>
          </div>
        </div>
      )}

      {apiUnavailable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Audit API not yet available
              </h3>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                The audit database and logging service exist, but the
                read-only API endpoint has not been connected yet.
                No demonstration records are being displayed.
              </p>
              <p className="mt-2 text-xs text-amber-800">
                The backend must provide GET /api/audit-logs with
                audit:read permission enforcement.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!apiUnavailable && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-xs font-semibold text-slate-700">
              Audit events
            </span>
            <span className="text-xs text-slate-500">
              {total.toLocaleString()} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Sequence', 'Timestamp', 'Actor', 'Action', 'Resource', 'Record'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {heading}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                      Loading audit records...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                      No audit records found.
                    </td>
                  </tr>
                ) : records.map((record) => (
                  <React.Fragment key={record.id}>
                    <tr className="border-b border-slate-50 hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                        {String(record.sequenceNumber)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                        {formatDate(record.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-800">
                        {actorName(record)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {record.action}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                          {record.resource}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#FF5B00]">
                        {record.resourceId}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(
                            expandedId === record.id ? null : record.id
                          )}
                          aria-label="Toggle audit record details"
                          className="rounded p-1 text-slate-500 hover:bg-slate-100"
                        >
                          {expandedId === record.id
                            ? <ChevronUp className="h-4 w-4" />
                            : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>

                    {expandedId === record.id && (
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <td colSpan={7} className="p-4">
                          <div className="grid gap-3 text-xs sm:grid-cols-2">
                            <div>
                              <p className="font-bold text-slate-600">Actor ID</p>
                              <p className="mt-1 break-all font-mono text-slate-500">
                                {record.actorUserId || 'System'}
                              </p>
                            </div>
                            <div>
                              <p className="font-bold text-slate-600">Audit record ID</p>
                              <p className="mt-1 break-all font-mono text-slate-500">
                                {record.id}
                              </p>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="font-bold text-slate-600">Record hash</p>
                              <p className="mt-1 break-all font-mono text-slate-500">
                                {record.hash}
                              </p>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="font-bold text-slate-600">Previous hash</p>
                              <p className="mt-1 break-all font-mono text-slate-500">
                                {record.prevHash}
                              </p>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="mb-1 font-bold text-slate-600">Event payload</p>
                              <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-5 text-slate-100">
                                {JSON.stringify(record.payload, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
