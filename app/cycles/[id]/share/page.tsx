"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { CycleDetail, PitchStatus } from "@/lib/types";
import clsx from "clsx";

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusConfig: Record<PitchStatus, { label: string; className: string }> = {
  PLANNED: {
    label: "Planned",
    className: "bg-slate-700 text-slate-300 border border-slate-600",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-sky-900/50 text-sky-300 border border-sky-700/50",
  },
  DONE: {
    label: "Done",
    className: "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50",
  },
  DROPPED: {
    label: "Dropped",
    className: "bg-red-900/50 text-red-300 border border-red-700/50",
  },
};

export default function ShareCyclePage() {
  const params = useParams();
  const cycleId = params.id as string;

  const [cycle, setCycle] = useState<CycleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCycle = useCallback(async () => {
    try {
      const res = await fetch(`/api/cycles/${cycleId}`);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !cycle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-slate-400 text-lg">{error || "Cycle not found"}</p>
        </div>
      </div>
    );
  }

  // Sort pitches by priority (nulls last)
  const sortedPitches = [...cycle.pitches].sort((a, b) => {
    if (a.priority === null && b.priority === null) return 0;
    if (a.priority === null) return 1;
    if (b.priority === null) return -1;
    return a.priority - b.priority;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-100">{cycle.name}</h1>
              <p className="text-slate-400 mt-1">
                {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
              </p>
            </div>
          </div>
          {cycle.description && (
            <p className="text-slate-400 mt-4 max-w-3xl">{cycle.description}</p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {sortedPitches.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-slate-400">No pitches in this cycle yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedPitches.map((pitch) => {
              const statusInfo = statusConfig[pitch.status];
              const isFullyStaffed = pitch.remainingWeeks <= 0;

              return (
                <div
                  key={pitch.id}
                  className="bg-slate-800/80 rounded-xl border border-slate-700/60 p-5 backdrop-blur-sm"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {pitch.priority && (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-xs font-bold text-slate-300">
                            {pitch.priority}
                          </span>
                        )}
                        <h3 className="font-semibold text-slate-100 truncate">
                          {pitch.title}
                        </h3>
                      </div>
                      <span
                        className={clsx(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          statusInfo.className
                        )}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {pitch.notes && (
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                      {pitch.notes}
                    </p>
                  )}

                  {/* Estimate */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Estimate</span>
                      <span className="font-medium text-slate-200">
                        {pitch.estimateWeeks.toFixed(1)}w
                      </span>
                    </div>

                    <div className="h-2 rounded-full overflow-hidden bg-slate-700">
                      <div
                        className={clsx(
                          "h-full rounded-full transition-all duration-300",
                          pitch.remainingWeeks < 0
                            ? "bg-red-500"
                            : pitch.remainingWeeks === 0
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                        )}
                        style={{
                          width: `${Math.min((pitch.assignedWeeks / pitch.estimateWeeks) * 100, 100)}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Assigned</span>
                      <span className="font-medium text-slate-200">
                        {pitch.assignedWeeks.toFixed(1)}w
                      </span>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div
                    className={clsx(
                      "text-xs text-center font-medium rounded-lg py-1.5 mb-4",
                      isFullyStaffed
                        ? pitch.remainingWeeks < 0
                          ? "text-red-300 bg-red-900/30 border border-red-800/50"
                          : "text-emerald-300 bg-emerald-900/30 border border-emerald-800/50"
                        : "text-amber-300 bg-amber-900/30 border border-amber-800/50"
                    )}
                  >
                    {isFullyStaffed
                      ? pitch.remainingWeeks < 0
                        ? `Over by ${Math.abs(pitch.remainingWeeks).toFixed(1)}w`
                        : "Fully staffed"
                      : `${pitch.remainingWeeks.toFixed(1)}w unassigned`}
                  </div>

                  {/* Assignments */}
                  {pitch.assignments.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Team
                      </div>
                      <div className="space-y-2">
                        {pitch.assignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-semibold">
                                {assignment.engineerName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <span className="text-sm text-slate-200">
                                {assignment.engineerName}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-primary-400">
                              {assignment.weeksAllocated.toFixed(1)}w
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pitch.assignments.length === 0 && (
                    <div className="text-center py-3 border-2 border-dashed border-slate-600 rounded-lg">
                      <p className="text-sm text-slate-500">No engineers assigned</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
