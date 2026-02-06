"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { CycleDetail, PitchWithAssignments, Pod } from "@/lib/types";
import clsx from "clsx";

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusConfig: Record<string, { label: string; className: string }> = {
  BACKLOG: { label: "Backlog", className: "bg-gray-700 text-gray-300" },
  PLANNING: { label: "Planning", className: "bg-blue-500/25 text-blue-400" },
  READY_FOR_DEV: { label: "Ready for Dev", className: "bg-violet-500/25 text-violet-400" },
  COMPLETE: { label: "Complete", className: "bg-emerald-500/25 text-emerald-400" },
  CANCELED: { label: "Canceled", className: "bg-gray-700 text-gray-500 line-through" },
  PLANNED: { label: "Backlog", className: "bg-gray-700 text-gray-300" },
  IN_PROGRESS: { label: "Ready for Dev", className: "bg-violet-500/25 text-violet-400" },
  DONE: { label: "Complete", className: "bg-emerald-500/25 text-emerald-400" },
  DROPPED: { label: "Canceled", className: "bg-gray-700 text-gray-500 line-through" },
};

const defaultStatus = { label: "Unknown", className: "bg-gray-700 text-gray-300" };

// Compact pitch card for Kanban view
function KanbanPitchCard({ pitch }: { pitch: PitchWithAssignments }) {
  const statusInfo = statusConfig[pitch.status] || defaultStatus;
  const filledPercentage = pitch.estimateWeeks > 0
    ? (pitch.assignedWeeks / pitch.estimateWeeks) * 100
    : 0;

  const getStatusColor = () => {
    if (pitch.remainingWeeks < 0) return "bg-red-500";
    if (pitch.remainingWeeks === 0) return "bg-emerald-500";
    return "bg-amber-500";
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {pitch.priority && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-700 text-xs font-semibold text-gray-300">
                {pitch.priority}
              </span>
            )}
            {pitch.pitchDocUrl ? (
              <a
                href={pitch.pitchDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sm text-gray-100 hover:text-white transition-colors truncate flex items-center gap-1"
              >
                {pitch.title}
                <svg className="w-3 h-3 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : (
              <h3 className="font-semibold text-sm text-gray-100 truncate">{pitch.title}</h3>
            )}
          </div>
          <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", statusInfo.className)}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2 mb-4">
        <div className="h-2 rounded-full overflow-hidden bg-gray-800">
          <div
            className={clsx("h-full rounded-full transition-all", getStatusColor())}
            style={{ width: `${Math.min(filledPercentage, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            {pitch.assignedWeeks.toFixed(1)}w / {Number(pitch.estimateWeeks).toFixed(1)}w
          </span>
          {pitch.remainingWeeks > 0 && (
            <span className="text-amber-400">{pitch.remainingWeeks.toFixed(1)}w left</span>
          )}
          {pitch.remainingWeeks === 0 && (
            <span className="text-emerald-400">Staffed</span>
          )}
          {pitch.remainingWeeks < 0 && (
            <span className="text-red-400">Over by {Math.abs(pitch.remainingWeeks).toFixed(1)}w</span>
          )}
        </div>
      </div>

      {/* Team - Stacked with full names */}
      <div className="space-y-1.5">
        {/* Product Manager */}
        {pitch.productManagerName && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
              {pitch.productManagerName.split(" ").map((n) => n[0]).join("")}
            </div>
            <span className="text-sm text-gray-300 truncate">{pitch.productManagerName}</span>
            <span className="text-xs text-violet-400 shrink-0">PM</span>
          </div>
        )}

        {/* Product Designer */}
        {pitch.productDesignerName && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-pink-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
              {pitch.productDesignerName.split(" ").map((n) => n[0]).join("")}
            </div>
            <span className="text-sm text-gray-300 truncate">{pitch.productDesignerName}</span>
            <span className="text-xs text-pink-400 shrink-0">Design</span>
          </div>
        )}

        {/* Engineers */}
        {pitch.assignments.map((assignment) => (
          <div key={assignment.id} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-xs font-medium shrink-0">
              {assignment.engineerName.split(" ").map((n) => n[0]).join("")}
            </div>
            <span className="text-sm text-gray-300 truncate">{assignment.engineerName}</span>
            <span className="text-xs text-gray-500 shrink-0">{assignment.weeksAllocated.toFixed(1)}w</span>
          </div>
        ))}

        {/* Empty state */}
        {!pitch.productManagerName && !pitch.productDesignerName && pitch.assignments.length === 0 && (
          <p className="text-xs text-gray-500 italic">No team assigned</p>
        )}
      </div>
    </div>
  );
}

// Kanban Column
function KanbanColumn({
  title,
  subtitle,
  pitches,
}: {
  title: string;
  subtitle?: string;
  pitches: PitchWithAssignments[];
}) {
  const totalWeeks = pitches.reduce((sum, p) => sum + Number(p.estimateWeeks), 0);
  const assignedWeeks = pitches.reduce((sum, p) => sum + p.assignedWeeks, 0);

  return (
    <div className="flex flex-col w-80 min-w-80 bg-gray-800/30 rounded-xl border border-gray-700/50">
      {/* Column Header */}
      <div className="p-4 border-b border-gray-700/50">
        <h3 className="font-semibold text-gray-100 mb-1">{title}</h3>
        {subtitle && (
          <div className="text-xs text-violet-400 mb-2">{subtitle}</div>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{pitches.length} pitch{pitches.length !== 1 ? "es" : ""}</span>
          <span>•</span>
          <span>{assignedWeeks.toFixed(1)}w / {totalWeeks.toFixed(1)}w</span>
        </div>
      </div>

      {/* Pitches */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {pitches.map((pitch) => (
          <KanbanPitchCard key={pitch.id} pitch={pitch} />
        ))}
        
        {pitches.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            <p>No pitches</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShareCyclePage() {
  const params = useParams();
  const cycleId = params.id as string;

  const [cycle, setCycle] = useState<CycleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCycle = useCallback(async () => {
    try {
      const res = await fetch(`/api/cycles/${cycleId}/share`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Cycle not found");
        } else {
          throw new Error("Failed to fetch cycle");
        }
        return;
      }
      const data = await res.json();
      setCycle(data);
    } catch {
      setError("Failed to load cycle");
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    fetchCycle();
  }, [fetchCycle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-gray-300 rounded-full" />
      </div>
    );
  }

  if (error || !cycle) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gray-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-400">{error || "Cycle not found"}</p>
        </div>
      </div>
    );
  }

  // Sort pitches by priority
  const sortedPitches = [...cycle.pitches].sort((a, b) => {
    if (a.priority === null && b.priority === null) return 0;
    if (a.priority === null) return 1;
    if (b.priority === null) return -1;
    return a.priority - b.priority;
  });

  const unassignedPitches = sortedPitches.filter((p) => !p.podId);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 shrink-0">
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-100">{cycle.name}</h1>
              <p className="text-sm text-gray-500">
                {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
              </p>
            </div>
          </div>
          {cycle.description && (
            <p className="text-sm text-gray-400 mt-3 max-w-3xl">{cycle.description}</p>
          )}
        </div>
      </header>

      {/* Summary Stats */}
      <div className="px-6 py-4 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Available:</span>
            <span className="font-semibold text-gray-100">{cycle.totalAvailableWeeks.toFixed(1)}w</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Required:</span>
            <span className="font-semibold text-gray-100">{cycle.totalRequiredWeeks.toFixed(1)}w</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Balance:</span>
            <span className={clsx(
              "font-semibold",
              cycle.surplusOrDeficit >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {cycle.surplusOrDeficit >= 0 ? "+" : ""}{cycle.surplusOrDeficit.toFixed(1)}w
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Pitches:</span>
            <span className="font-semibold text-gray-100">{cycle.pitches.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Engineers:</span>
            <span className="font-semibold text-gray-100">{cycle.engineers.length}</span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <main className="flex-1 overflow-hidden p-6 h-[calc(100vh-190px)]">
        {cycle.pitches.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gray-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500">No pitches in this cycle yet</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-x-auto scrollbar-thin">
            <div className="flex gap-4 h-full pb-4">
              {/* Unassigned Column - only show if there are unassigned pitches */}
              {unassignedPitches.length > 0 && (
                <KanbanColumn
                  title="Unassigned"
                  pitches={unassignedPitches}
                />
              )}

              {/* Pod Columns */}
              {cycle.pods.map((pod) => (
                <KanbanColumn
                  key={pod.id}
                  title={pod.name}
                  subtitle={pod.leaderName ? `Lead: ${pod.leaderName}` : undefined}
                  pitches={sortedPitches.filter((p) => p.podId === pod.id)}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
