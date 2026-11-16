'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  RefreshCw,
  Search,
  User,
  MapPin,
  Wrench,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import { WorkOrderStatusBadge, type WorkOrderStatus } from '@/src/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityBadge, type WorkOrderPriority } from '@/src/components/work-orders/WorkOrderPriorityBadge';

interface StaffMember {
  id: string;
  name: string;
  email?: string;
  isActive: boolean;
  role?: { name: string };
  branch?: { name: string };
  department?: { name: string };
}

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  type?: string;
  asset?: { name: string };
  location?: { name: string };
  branch?: { name: string };
  assignedUser?: { id: string; name: string };
}

interface DispatchLane {
  id: string;
  name: string;
  description: string;
  staff?: StaffMember;
}

export default function DispatchBoardPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [assigningId, setAssigningId] = useState('');
  const [draggedId, setDraggedId] = useState('');

  const loadBoard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const [workOrdersResponse, usersResponse] = await Promise.all([
        fetch('/api/work-orders'),
        fetch('/api/users'),
      ]);

      const [workOrdersData, usersData] = await Promise.all([
        workOrdersResponse.json(),
        usersResponse.json(),
      ]);

      if (!workOrdersResponse.ok) {
        throw new Error(
          workOrdersData?.message ||
          workOrdersData?.error ||
          'Unable to load work orders.'
        );
      }

      if (!usersResponse.ok) {
        throw new Error(
          usersData?.message ||
          usersData?.error ||
          'Unable to load staff members.'
        );
      }

      setWorkOrders(workOrdersData.workOrders ?? []);

      const userList = Array.isArray(usersData)
        ? usersData
        : usersData.data ?? usersData.users ?? [];

      setStaff(userList.filter((person: StaffMember) => person.isActive));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the dispatch board.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const assignWorkOrder = async (workOrderId: string, assignedUserId: string) => {
    if (!assignedUserId) return;

    setAssigningId(workOrderId);
    setError('');

    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedUserId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
          result?.error ||
          'The work order could not be assigned.'
        );
      }

      await loadBoard(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed.');
    } finally {
      setAssigningId('');
      setDraggedId('');
    }
  };

  const filteredWorkOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return workOrders;

    return workOrders.filter((wo) =>
      [
        wo.workOrderNumber,
        wo.title,
        wo.asset?.name,
        wo.location?.name,
        wo.assignedUser?.name,
        wo.branch?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [workOrders, search]);

  const lanes: DispatchLane[] = useMemo(() => {
    const activeIds = new Set(staff.map((person) => person.id));

    const result: DispatchLane[] = [
      {
        id: 'unassigned',
        name: 'Unassigned queue',
        description: 'Work orders waiting for a technician',
      },
      ...staff.map((person) => ({
        id: person.id,
        name: person.name,
        description: person.department?.name || person.role?.name || 'Technician',
        staff: person,
      })),
    ];

    const hasInactiveAssignments = filteredWorkOrders.some(
      (wo) => wo.assignedUser && !activeIds.has(wo.assignedUser.id)
    );

    if (hasInactiveAssignments) {
      result.push({
        id: 'other',
        name: 'Other assignments',
        description: 'Assigned to staff not in the active staff list',
      });
    }

    return result;
  }, [staff, filteredWorkOrders]);

  const getLaneOrders = (lane: DispatchLane) => {
    if (lane.id === 'unassigned') {
      return filteredWorkOrders.filter((wo) => !wo.assignedUser);
    }

    if (lane.id === 'other') {
      const activeIds = new Set(staff.map((person) => person.id));
      return filteredWorkOrders.filter(
        (wo) => wo.assignedUser && !activeIds.has(wo.assignedUser.id)
      );
    }

    return filteredWorkOrders.filter(
      (wo) => wo.assignedUser?.id === lane.id
    );
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, lane: DispatchLane) => {
    event.preventDefault();

    const workOrderId = event.dataTransfer.getData('text/plain');
    if (!workOrderId || lane.id === 'unassigned' || lane.id === 'other') return;

    const workOrder = workOrders.find((wo) => wo.id === workOrderId);
    if (!workOrder || workOrder.assignedUser?.id === lane.id) return;

    void assignWorkOrder(workOrderId, lane.id);
  };

  const unassignedCount = filteredWorkOrders.filter((wo) => !wo.assignedUser).length;
  const activeCount = filteredWorkOrders.filter(
    (wo) => wo.status === 'ASSIGNED' || wo.status === 'IN_PROGRESS'
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FF5B00]">
            <ClipboardList className="h-4 w-4" />
            Work Order Operations
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#080E29]">
            Dispatch Board
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Assign work orders and monitor technician workloads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/work-orders"
            className="rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            All Work Orders
          </Link>
          <button
            type="button"
            onClick={() => void loadBoard(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-md bg-[#080E29] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Visible work orders</p>
          <p className="mt-1 text-2xl font-semibold text-[#080E29]">{filteredWorkOrders.length}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">Awaiting assignment</p>
          <p className="mt-1 text-2xl font-semibold text-amber-900">{unassignedCount}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-blue-700">Assigned / in progress</p>
          <p className="mt-1 text-2xl font-semibold text-blue-900">{activeCount}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by work order, asset, location or technician..."
          aria-label="Search dispatch board"
          className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#FF5B00]"
        />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading dispatch board...
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {lanes.map((lane) => {
            const laneOrders = getLaneOrders(lane);
            const isUnassigned = lane.id === 'unassigned';

            return (
              <div
                key={lane.id}
                onDragOver={(event) => {
                  if (!isUnassigned && lane.id !== 'other') event.preventDefault();
                }}
                onDrop={(event) => handleDrop(event, lane)}
                className={`w-[300px] min-w-[300px] rounded-xl border p-3 ${
                  draggedId && lane.id !== 'unassigned' && lane.id !== 'other'
                    ? 'border-[#FF5B00] bg-orange-50/50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-[#080E29]">
                      {lane.name}
                    </h2>
                    <p className="mt-1 truncate text-[11px] text-slate-500">
                      {lane.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    {laneOrders.length}
                  </span>
                </div>

                {lane.staff && (
                  <div className="mb-3 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-[#D94D00]">
                      {lane.staff.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">{lane.staff.name}</p>
                      <p className="truncate text-[10px] text-slate-500">
                        {lane.staff.branch?.name || lane.staff.email || 'Active staff'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="min-h-28 space-y-3">
                  {laneOrders.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 px-3 py-8 text-center">
                      <User className="mx-auto h-5 w-5 text-slate-300" />
                      <p className="mt-2 text-xs text-slate-400">
                        {isUnassigned ? 'No unassigned work' : 'No work orders assigned'}
                      </p>
                      {!isUnassigned && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          Drop a work order here to assign it
                        </p>
                      )}
                    </div>
                  ) : (
                    laneOrders.map((wo) => (
                      <article
                        key={wo.id}
                        draggable={!isUnassigned && lane.id !== 'other' ? true : true}
                        onDragStart={(event) => {
                          setDraggedId(wo.id);
                          event.dataTransfer.setData('text/plain', wo.id);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => setDraggedId('')}
                        className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-orange-300 ${
                          draggedId === wo.id ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/work-orders/${wo.id}`}
                            className="font-mono text-xs font-bold text-[#D94D00] hover:underline"
                          >
                            {wo.workOrderNumber}
                          </Link>
                          <WorkOrderPriorityBadge priority={wo.priority} size="sm" />
                        </div>

                        <Link
                          href={`/work-orders/${wo.id}`}
                          className="mt-2 block text-sm font-semibold text-slate-800 hover:text-[#D94D00]"
                        >
                          {wo.title}
                        </Link>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <WorkOrderStatusBadge status={wo.status} size="sm" />
                          {wo.type && (
                            <span className="text-[10px] text-slate-500">{wo.type}</span>
                          )}
                        </div>

                        <div className="mt-3 space-y-1.5 text-[11px] text-slate-500">
                          {wo.asset && (
                            <div className="flex items-center gap-1.5">
                              <Wrench className="h-3 w-3 shrink-0" />
                              <span className="truncate">{wo.asset.name}</span>
                            </div>
                          )}
                          {wo.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{wo.location.name}</span>
                            </div>
                          )}
                          {wo.branch && (
                            <div className="truncate text-slate-400">{wo.branch.name}</div>
                          )}
                        </div>

                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <UserPlus className="h-3 w-3" />
                            Assign technician
                          </label>
                          <select
                            aria-label={`Assign ${wo.workOrderNumber} to a technician`}
                            value={wo.assignedUser?.id ?? ''}
                            disabled={assigningId === wo.id || staff.length === 0}
                            onChange={(event) => {
                              if (event.target.value) {
                                void assignWorkOrder(wo.id, event.target.value);
                              }
                            }}
                            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#FF5B00] disabled:opacity-50"
                          >
                            <option value="" disabled>
                              {staff.length ? 'Select technician' : 'No active staff available'}
                            </option>
                            {staff.map((person) => (
                              <option key={person.id} value={person.id}>
                                {person.name}
                                {person.department?.name ? ` — ${person.department.name}` : ''}
                              </option>
                            ))}
                          </select>
                          {assigningId === wo.id && (
                            <p className="mt-1 text-[10px] text-[#D94D00]">Saving assignment...</p>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Tip: Drag a work-order card onto an active technician&apos;s lane, or use the assignment dropdown.
        Assignments are saved through the existing work-order API.
      </p>
    </div>
  );
}



