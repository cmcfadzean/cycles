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

  // Sort pitches by priority (nulls last), then by status
  const sortedPitches = [...cycle.pitches].sort((a, b) => {
    if (a.priority === null && b.priority === null) return 0;
    if (a.priority === null) return 1;
    if (b.priority === null) return -1;
    return a.priority - b.priority;
  });

  const totalEstimate = cycle.pitches.reduce((sum, p) => sum + p.estimateWeeks, 0);
  const totalAssigned = cycle.pitches.reduce((sum, p) => sum + p.assignedWeeks, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
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
            <p className="text-slate-400 mt-2 max-w-2xl">{cycle.description}</p>
          )}

          {/* Stats */}
          <div className="flex gap-6 mt-6">
            <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/50">
              <div className="text-sm text-slate-400">Pitches</div>
              <div className="text-2xl font-bold text-slate-100">{cycle.pitches.length}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/50">
              <div className="text-sm text-slate-400">Total Estimate</div>
              <div className="text-2xl font-bold text-slate-100">{totalEstimate.toFixed(1)}w</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/50">
              <div className="text-sm text-slate-400">Assigned</div>
              <div className="text-2xl font-bold text-slate-100">{totalAssigned.toFixed(1)}w</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/50">
              <div className="text-sm text-slate-400">Team Size</div>
              <div className="text-2xl font-bold text-slate-100">{cycle.engineers.length}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
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
          <div className="space-y-4">
            {sortedPitches.map((pitch) => {
              const statusInfo = statusConfig[pitch.status];
              const isFullyStaffed = pitch.remainingWeeks <= 0;

              return (
                <div
                  key={pitch.id}
                  className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-5 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {pitch.priority && (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-700 text-sm font-bold text-slate-300">
                            {pitch.priority}
                          </span>
                        )}
                        <h3 className="text-lg font-semibold text-slate-100 truncate">
                          {pitch.title}
                        </h3>
                        <span
                          className={clsx(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            statusInfo.className
                          )}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      {pitch.notes && (
                        <p className="text-sm text-slate-400 mb-3">{pitch.notes}</p>
                      )}

                      {/* Assignments */}
                      {pitch.assignments.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {pitch.assignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1.5"
                            >
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-semibold">
                                {assignment.engineerName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <span className="text-sm text-slate-200">
                                {assignment.engineerName}
                              </span>
                              <span className="text-sm font-medium text-primary-400">
                                {assignment.weeksAllocated.toFixed(1)}w
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 mt-3 italic">
                          No engineers assigned yet
                        </p>
                      )}
                    </div>

                    {/* Estimate & Progress */}
                    <div className="text-right shrink-0">
                      <div className="text-sm text-slate-400 mb-1">Estimate</div>
                      <div className="text-xl font-bold text-slate-100">
                        {pitch.estimateWeeks.toFixed(1)}w
                      </div>
                      <div
                        className={clsx(
                          "text-xs font-medium mt-2 px-2 py-1 rounded-lg inline-block",
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Team Summary */}
        {cycle.engineers.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Team</h2>
            <div className="flex flex-wrap gap-3">
              {cycle.engineers.map((engineer) => (
                <div
                  key={engineer.id}
                  className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-4 py-2 border border-slate-700/60"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                    {engineer.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-200">
                      {engineer.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {engineer.availableWeeks.toFixed(1)}w capacity
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-800 text-center">
          <p className="text-sm text-slate-500">
            Cycle Planning • Last updated {new Date().toLocaleDateString()}
          </p>
        </div>
      </main>
    </div>
  );
}

