'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardCheck,
  Search,
  RefreshCw,
  Eye,
  Clock3,
  AlertTriangle,
  X,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';

type InvoiceLine = {
  id: string;
  description?: string;
  quantity?: string | number;
  unitPrice?: string | number;
  lineTotal?: string | number;
};

type PendingInvoice = {
  id: string;
  draftReference: string;
  invoiceNumber?: string | null;
  status: string;
  currency?: string;
  totalAmount?: string | number;
  subtotal?: string | number;
  createdAt: string;
  createdByUserId?: string;
  customer?: { name?: string; customerNumber?: string };
  site?: { name?: string; siteCode?: string } | null;
  lines?: InvoiceLine[];
};

const money = (amount: string | number | undefined, currency = 'GHS') =>
  `${currency} ${Number(amount ?? 0).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString('en-GH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};

export default function ApprovalInboxPage() {
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PendingInvoice | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/finance/invoices', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load invoice records.');
      }

      setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load invoice records.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
  }, []);

  const pendingInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'PENDING_APPROVAL'),
    [invoices],
  );

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return pendingInvoices;

    return pendingInvoices.filter((invoice) =>
      [
        invoice.draftReference,
        invoice.invoiceNumber,
        invoice.customer?.name,
        invoice.customer?.customerNumber,
        invoice.site?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [pendingInvoices, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Management"
        eyebrowIcon={ClipboardCheck}
        title="Approval Inbox"
        description="Review invoices awaiting approval. Approval decisions will be enabled when the secured approval workflow is available."
        actions={
          <button
            type="button"
            onClick={loadInvoices}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Frontend preview — not for live approval decisions</p>
          <p className="mt-1 leading-6 text-amber-800">
            The current invoice API does not filter records by organisational
            scope or provide the required approver permissions. This page is
            read-only. Approve and reject actions will remain unavailable until
            the backend is secured.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Pending invoices</p>
            <span className="rounded-lg bg-orange-50 p-2 text-[#FF5B00]">
              <Clock3 className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {loading ? '—' : pendingInvoices.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Awaiting review</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total pending value</p>
            <span className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <FileText className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {loading
              ? '—'
              : money(
                  pendingInvoices.reduce(
                    (total, invoice) => total + Number(invoice.totalAmount ?? 0),
                    0,
                  ),
                )}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Combined value of pending invoices
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Invoices awaiting approval</h2>
            <p className="mt-1 text-xs text-slate-500">
              Select an invoice to inspect its available details.
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reference or customer..."
              aria-label="Search pending invoices"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-[#FF5B00] focus:ring-2 focus:ring-[#FF5B00]/15"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
            <p className="mt-3 font-medium text-slate-800">Could not load approvals</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
            <button
              type="button"
              onClick={loadInvoices}
              className="mt-4 rounded-lg bg-[#FF5B00] px-4 py-2 text-sm font-medium text-white hover:bg-[#e95100]"
            >
              Try again
            </button>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 font-semibold text-slate-800">
              {search ? 'No matching invoices' : 'No pending invoices'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? 'Try another reference or customer name.'
                : 'Invoices submitted for approval will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Invoice reference
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Maker
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Submitted
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-mono text-sm font-semibold text-[#E95100]">
                        {invoice.draftReference}
                      </p>
                      <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        Pending approval
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {invoice.customer?.name || 'Customer unavailable'}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {invoice.createdByUserId
                        ? `Creator ${invoice.createdByUserId.slice(0, 8)}…`
                        : 'Maker details unavailable'}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {dateLabel(invoice.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {money(invoice.totalAmount, invoice.currency)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(invoice)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[#FF5B00] hover:text-[#E95100]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-detail-title"
            className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#E95100]">
                  Invoice review
                </p>
                <h2 id="approval-detail-title" className="mt-1 text-lg font-semibold text-slate-900">
                  {selected.draftReference}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Submitted {dateLabel(selected.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close invoice details"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Customer</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {selected.customer?.name || 'Unavailable'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Invoice total</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {money(selected.totalAmount, selected.currency)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Maker reference</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-900">
                    {selected.createdByUserId || 'Unavailable'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Site</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {selected.site?.name || 'Not specified'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">Invoice line items</h3>
                {!selected.lines?.length ? (
                  <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    No line-item details were returned by the API.
                  </p>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                    {selected.lines.map((line) => (
                      <div key={line.id} className="border-b border-slate-100 p-4 last:border-0">
                        <p className="text-sm font-medium text-slate-800">
                          {line.description || 'Invoice item'}
                        </p>
                        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                          <span>
                            Qty {line.quantity ?? '—'} × {money(line.unitPrice, selected.currency)}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {money(line.lineTotal, selected.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-2 text-amber-800">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Decision controls unavailable</p>
                    <p className="mt-1 text-xs leading-5">
                      Approval and rejection will be connected after the backend
                      enforces maker-checker rules, permissions and organisational scope.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close details
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
