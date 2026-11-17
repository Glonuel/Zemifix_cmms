'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  User,
  Wrench,
  AlertCircle,
} from 'lucide-react';

import { PageHeader } from '@/src/components/ui/PageHeader';
import {
  WorkOrderStatusBadge,
  type WorkOrderStatus,
} from '@/src/components/work-orders/WorkOrderStatusBadge';

type WorkOrder = {
  id: string;
  workOrderNumber: string;
  title: string;
  status: string;
  priority: string;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  asset?: { id: string; name: string; assetTag: string } | null;
  assignedUser?: { id: string; name: string } | null;
  branch?: { name: string } | null;
};

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (value?: string | null) => {
  if (!value) return 'Not specified';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid time';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isValidDate = (value?: string | null) =>
  Boolean(value && !Number.isNaN(new Date(value).getTime()));

export default function WorkOrderSchedulePage() {
  const today = new Date();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(dateKey(today));

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/work-orders', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401 || response.status === 403
            ? 'You are not authorised to view these work orders.'
            : 'Unable to load the work-order schedule.'
        );
      }

      const data = await response.json();
      setWorkOrders(
        Array.isArray(data.workOrders) ? data.workOrders : []
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load work orders.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const scheduledOrders = useMemo(
    () => workOrders.filter((order) => isValidDate(order.plannedStart)),
    [workOrders]
  );

  const unscheduledOrders = useMemo(
    () => workOrders.filter((order) => !isValidDate(order.plannedStart)),
    [workOrders]
  );

  const ordersByDate = useMemo(() => {
    const grouped: Record<string, WorkOrder[]> = {};

    scheduledOrders.forEach((order) => {
      const key = dateKey(new Date(order.plannedStart!));
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(order);
    });

    return grouped;
  }, [scheduledOrders]);

  const selectedOrders = ordersByDate[selectedDate] ?? [];

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );

    const mondayOffset = (firstDay.getDay() + 6) % 7;

    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [currentMonth]);

  const technicians = useMemo(() => {
    const grouped: Record<
      string,
      { name: string; total: number; active: number }
    > = {};

    workOrders.forEach((order) => {
      if (!order.assignedUser?.id) return;

      const id = order.assignedUser.id;

      if (!grouped[id]) {
        grouped[id] = {
          name: order.assignedUser.name,
          total: 0,
          active: 0,
        };
      }

      grouped[id].total += 1;

      if (
        ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'].includes(order.status)
      ) {
        grouped[id].active += 1;
      }
    });

    return Object.values(grouped).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [workOrders]);

  const completedCount = workOrders.filter(
    (order) => order.status === 'COMPLETED'
  ).length;

  const activeCount = workOrders.filter((order) =>
    ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'].includes(order.status)
  ).length;

  const changeMonth = (direction: number) => {
    setCurrentMonth(
      (previous) =>
        new Date(
          previous.getFullYear(),
          previous.getMonth() + direction,
          1
        )
    );
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(dateKey(now));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Work Orders"
        eyebrowIcon={CalendarDays}
        title="Work Order Planning Calendar"
        description="Plan scheduled work, monitor technician assignments and review daily maintenance activity."
        breadcrumbs={[
          { label: 'Work Orders', href: '/work-orders' },
          { label: 'Calendar' },
        ]}
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <button
            onClick={fetchWorkOrders}
            className="ml-auto font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: 'Total work orders',
            value: workOrders.length,
            color: 'text-slate-900',
          },
          {
            label: 'Scheduled',
            value: scheduledOrders.length,
            color: 'text-blue-700',
          },
          {
            label: 'Active',
            value: activeCount,
            color: 'text-amber-700',
          },
          {
            label: 'Completed',
            value: completedCount,
            color: 'text-emerald-700',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
          >
            <p className="text-xs font-medium text-slate-500">
              {item.label}
            </p>
            <p className={`mt-2 text-2xl font-bold ${item.color}`}>
              {loading ? '—' : item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs xl:col-span-2 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Monthly schedule
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Select a date to view its scheduled work orders.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Today
              </button>
              <button
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="text-center text-lg font-bold text-slate-900">
            {currentMonth.toLocaleDateString([], {
              month: 'long',
              year: 'numeric',
            })}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
              (day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-semibold text-slate-500"
                >
                  {day}
                </div>
              )
            )}

            {calendarDays.map((date) => {
              const key = dateKey(date);
              const dayOrders = ordersByDate[key] ?? [];
              const isCurrentMonth =
                date.getMonth() === currentMonth.getMonth();
              const isToday = key === dateKey(today);
              const isSelected = key === selectedDate;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={`min-h-[76px] rounded-lg border p-1.5 text-left transition-colors sm:min-h-[92px] sm:p-2 ${
                    isSelected
                      ? 'border-[#FF5B00] bg-orange-50 ring-1 ring-[#FF5B00]'
                      : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                  } ${!isCurrentMonth ? 'bg-slate-50/60' : 'bg-white'}`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday
                        ? 'bg-[#FF5B00] text-white'
                        : isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-300'
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  {dayOrders.length > 0 && (
                    <div className="mt-1 space-y-1">
                      <span className="block rounded bg-blue-100 px-1 py-0.5 text-center text-[10px] font-bold text-blue-800">
                        {dayOrders.length} {dayOrders.length === 1 ? 'job' : 'jobs'}
                      </span>
                      <div className="hidden flex-wrap gap-1 sm:flex">
                        {dayOrders.slice(0, 3).map((order) => (
                          <span
                            key={order.id}
                            className={`h-1.5 w-1.5 rounded-full ${
                              order.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : order.status === 'IN_PROGRESS'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              In progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Completed
            </span>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-slate-900">Daily schedule</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                    [],
                    {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }
                  )}
                </p>
              </div>
              <CalendarDays className="h-5 w-5 text-[#FF5B00]" />
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="py-5 text-center text-sm text-slate-400">
                  Loading schedule...
                </p>
              ) : selectedOrders.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
                  No work orders scheduled for this date.
                </p>
              ) : (
                selectedOrders
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(a.plannedStart!).getTime() -
                      new Date(b.plannedStart!).getTime()
                  )
                  .map((order) => (
                    <div
                      key={order.id}
                      className="rounded-lg border border-slate-200 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#FF5B00]">
                          {order.workOrderNumber}
                        </span>
                        <WorkOrderStatusBadge
                          status={order.status as WorkOrderStatus}
                          size="sm"
                        />
                      </div>

                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {order.title}
                      </p>

                      <div className="mt-2 space-y-1.5 text-xs text-slate-500">
                        <p className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(order.plannedStart)} – {formatTime(order.plannedEnd)}
                        </p>
                        {order.asset && (
                          <p className="flex items-center gap-2">
                            <Wrench className="h-3.5 w-3.5" />
                            {order.asset.name} ({order.asset.assetTag})
                          </p>
                        )}
                        {order.assignedUser && (
                          <p className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            {order.assignedUser.name}
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/work-orders/${order.id}`}
                        className="mt-3 inline-flex text-xs font-semibold text-[#FF5B00] hover:underline"
                      >
                        View work order →
                      </Link>
                    </div>
                  ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Technician workload</h2>
              <User className="h-5 w-5 text-[#FF5B00]" />
            </div>

            {loading ? (
              <p className="py-5 text-center text-sm text-slate-400">
                Loading technicians...
              </p>
            ) : technicians.length === 0 ? (
              <p className="mt-4 rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
                No technicians have been assigned work orders yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {technicians.map((technician) => (
                  <div
                    key={technician.name}
                    className="rounded-lg border border-slate-100 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      {technician.name}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {technician.total} total assignments
                      </span>
                      <span className="font-semibold text-blue-700">
                        {technician.active} active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">
              Work orders awaiting scheduling
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              These work orders do not currently have a planned start date.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            {loading ? '—' : unscheduledOrders.length} unscheduled
          </span>
        </div>

        {!loading && unscheduledOrders.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {unscheduledOrders.slice(0, 6).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-white p-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-[#FF5B00]">
                    {order.workOrderNumber}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-800">
                    {order.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {order.assignedUser?.name ?? 'Unassigned'}
                  </p>
                </div>
                <Link
                  href={`/work-orders/${order.id}`}
                  className="shrink-0 text-xs font-semibold text-[#FF5B00] hover:underline"
                >
                  Inspect
                </Link>
              </div>
            ))}
          </div>
        )}

        {!loading && unscheduledOrders.length === 0 && (
          <p className="mt-4 text-sm text-slate-600">
            All work orders have a planned start date.
          </p>
        )}

        {unscheduledOrders.length > 6 && (
          <p className="mt-3 text-xs text-slate-500">
            Showing the first 6 of {unscheduledOrders.length} unscheduled work orders.
          </p>
        )}
      </section>

      <div className="flex justify-end">
        <button
          onClick={fetchWorkOrders}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh schedule
        </button>
      </div>
    </div>
  );
}
