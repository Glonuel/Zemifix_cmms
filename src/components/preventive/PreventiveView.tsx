'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Wrench,
} from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { WorkOrderStatusBadge, type WorkOrderStatus } from '@/src/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityBadge, type WorkOrderPriority } from '@/src/components/work-orders/WorkOrderPriorityBadge';

type PreventiveWorkOrder = {
  id: string;
  workOrderNumber: string;
  title: string;
  type: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  asset?: {
    id: string;
    name: string;
    assetTag: string;
  } | null;
  assignedUser?: {
    id: string;
    name: string;
  } | null;
  branch?: {
    name: string;
  } | null;
};

const isWorkOrderOverdue = (
  plannedEnd?: string | null,
  status?: WorkOrderStatus
) => {
  if (!plannedEnd || ['COMPLETED', 'CANCELLED'].includes(status ?? '')) {
    return false;
  }

  const endDate = new Date(plannedEnd);

  return (
    !Number.isNaN(endDate.getTime()) &&
    endDate.getTime() < Date.now()
  );
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Not scheduled';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function PreventiveView() {
  const [workOrders, setWorkOrders] = useState<PreventiveWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPreventiveWorkOrders = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/work-orders', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          `Unable to load preventive maintenance (HTTP ${response.status}).`
        );
      }

      const allWorkOrders = Array.isArray(data.workOrders)
        ? data.workOrders
        : [];

      setWorkOrders(
        allWorkOrders.filter(
          (workOrder: PreventiveWorkOrder) =>
            workOrder.type === 'PREVENTIVE'
        )
      );

      setError(null);
    } catch (err) {
      setWorkOrders([]);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load preventive maintenance.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPreventiveWorkOrders();
  }, [fetchPreventiveWorkOrders]);


  const overdueCount = workOrders.filter((workOrder) =>
    isWorkOrderOverdue(workOrder.plannedEnd, workOrder.status)
  ).length;

  const openCount = workOrders.filter(
    (workOrder) =>
      !['COMPLETED', 'CANCELLED'].includes(workOrder.status)
  ).length;

  const completedCount = workOrders.filter(
    (workOrder) => workOrder.status === 'COMPLETED'
  ).length;

  const filteredWorkOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...workOrders]
      .filter((workOrder) => {
        const matchesSearch =
          !query ||
          [
            workOrder.workOrderNumber,
            workOrder.title,
            workOrder.asset?.name,
            workOrder.asset?.assetTag,
            workOrder.assignedUser?.name,
            workOrder.branch?.name,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(query)
            );

        const matchesStatus =
          !statusFilter || workOrder.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = a.plannedStart
          ? new Date(a.plannedStart).getTime()
          : Number.MAX_SAFE_INTEGER;

        const dateB = b.plannedStart
          ? new Date(b.plannedStart).getTime()
          : Number.MAX_SAFE_INTEGER;

        return dateA - dateB;
      });
  }, [workOrders, search, statusFilter]);

  const summaryCards = [
    {
      label: 'Total preventive WOs',
      value: workOrders.length,
      icon: CalendarCheck2,
      color: 'text-[#D94D00]',
      background: 'bg-orange-50',
    },
    {
      label: 'Unfinished work orders',
      value: openCount,
      icon: Clock,
      color: 'text-blue-700',
      background: 'bg-blue-50',
    },
    {
      label: 'Overdue work orders',
      value: overdueCount,
      icon: AlertCircle,
      color: 'text-red-700',
      background: 'bg-red-50',
    },
    {
      label: 'Completed work orders',
      value: completedCount,
      icon: CheckCircle2,
      color: 'text-green-700',
      background: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Maintenance"
        eyebrowIcon={CalendarCheck2}
        title="Preventive maintenance"
        description="Monitor scheduled preventive work orders, asset maintenance and completion status."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  {card.label}
                </span>
                <span className={`rounded-lg p-2 ${card.background} ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-[#080E29]">
                {loading ? '—' : card.value}
              </p>
            </div>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#080E29]">
              Preventive work orders
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Live records from the work-order service.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchPreventiveWorkOrders()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search work order, asset or technician..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-[#FF5B00]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-[#FF5B00]"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending approval</option>
            <option value="APPROVED">Approved</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="ON_HOLD">On hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading preventive maintenance records...
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-3 text-sm font-semibold text-slate-800">
              Unable to load preventive maintenance
            </p>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
            <button
              type="button"
              onClick={() => void fetchPreventiveWorkOrders()}
              className="mt-4 text-xs font-semibold text-[#D94D00] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filteredWorkOrders.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarCheck2 className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {workOrders.length === 0
                ? 'No preventive work orders found'
                : 'No matching work orders'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {workOrders.length === 0
                ? 'Preventive work orders will appear here when they are created.'
                : 'Try changing your search or status filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Work order</th>
                  <th className="px-5 py-3">Asset</th>
                  <th className="px-5 py-3">Planned start</th>
                  <th className="px-5 py-3">Planned end</th>
                  <th className="px-5 py-3">Technician</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredWorkOrders.map((workOrder) => {
                  const isOverdue = isWorkOrderOverdue(
                    workOrder.plannedEnd,
                    workOrder.status
                  );

                  return (
                    <tr key={workOrder.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <Link
                          href={`/work-orders/${workOrder.id}`}
                          className="font-semibold text-[#D94D00] hover:underline"
                        >
                          {workOrder.workOrderNumber}
                        </Link>
                        <p className="mt-1 max-w-[220px] truncate text-slate-700">
                          {workOrder.title}
                        </p>
                        {isOverdue && (
                          <span className="mt-1 inline-block text-[10px] font-semibold text-red-600">
                            Overdue
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-3.5 w-3.5 text-slate-400" />
                          <div>
                            <p>{workOrder.asset?.name || 'No asset linked'}</p>
                            {workOrder.asset?.assetTag && (
                              <p className="mt-1 text-[10px] text-slate-400">
                                {workOrder.asset.assetTag}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(workOrder.plannedStart)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(workOrder.plannedEnd)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {workOrder.assignedUser?.name || 'Unassigned'}
                      </td>

                      <td className="px-5 py-4">
                        <WorkOrderPriorityBadge priority={workOrder.priority} size="sm" />
                      </td>

                      <td className="px-5 py-4">
                        <WorkOrderStatusBadge status={workOrder.status} size="sm" />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/work-orders/${workOrder.id}`}
                          className="font-semibold text-[#D94D00] hover:underline"
                        >
                          View details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500">
              Showing {filteredWorkOrders.length} of {workOrders.length} preventive work orders
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
