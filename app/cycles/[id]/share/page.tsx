"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { CycleDetail, PitchStatus, PitchWithAssignments } from "@/lib/types";
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
    className: "bg-gray-700 text-gray-300",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-violet-500/25 text-violet-400",
  },
  DONE: {
    label: "Done",
    className: "bg-emerald-500/25 text-emerald-400",
  },
  DROPPED: {
    label: "Dropped",
    className: "bg-gray-700 text-gray-500 line-through",
  },
};

function PitchCard({ pitch }: { pitch: PitchWithAssignments }) {
  const statusInfo = statusConfig[pitch.status];
  const isFullyStaffed = pitch.remainingWeeks <= 0;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {pitch.priority && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-800 text-xs font-medium text-gray-400">
                {pitch.priority}
              </span>
            )}
            {pitch.pitchDocUrl ? (
              <a
                href={pitch.pitchDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-100 hover:text-white transition-colors truncate flex items-center gap-1"
              >
                {pitch.title}
                <svg
                  className="w-3 h-3 shrink-0 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            ) : (
              <h3 className="font-medium text-gray-100 truncate">
                {pitch.title}
              </h3>
            )}
          </div>
          <span
            className={clsx(
              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
              statusInfo.className
            )}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>

      {pitch.notes && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
          {pitch.notes}
        </p>
      )}

      {/* Estimate */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Estimate</span>
          <span className="font-medium text-gray-300">
            {pitch.estimateWeeks.toFixed(1)}w
          </span>
        </div>

        <div className="h-1.5 rounded-full overflow-hidden bg-gray-800">
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
          <span className="text-gray-500">Assigned</span>
          <span className="font-medium text-gray-300">
            {pitch.assignedWeeks.toFixed(1)}w
          </span>
        </div>
      </div>

      {/* Status indicator */}
      <div
        className={clsx(
          "text-xs text-center font-semibold rounded py-1.5 mb-3",
          isFullyStaffed
            ? pitch.remainingWeeks < 0
              ? "text-red-400 bg-red-500/20"
              : "text-emerald-400 bg-emerald-500/20"
            : "text-amber-400 bg-amber-500/20"
        )}
      >
        {isFullyStaffed
          ? pitch.remainingWeeks < 0
            ? `Over by ${Math.abs(pitch.remainingWeeks).toFixed(1)}w`
            : "Fully staffed"
          : `${pitch.remainingWeeks.toFixed(1)}w unassigned`}
      </div>

      {/* Engineers Section */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Engineers
        </div>
        {pitch.assignments.length > 0 ? (
          <div className="space-y-1.5">
            {pitch.assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between bg-gray-800/50 rounded px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center text-gray-400 text-xs font-medium">
                    {assignment.engineerName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <span className="text-sm text-gray-300">
                    {assignment.engineerName}
                  </span>
                </div>
                <span className="text-sm text-gray-400">
                  {assignment.weeksAllocated.toFixed(1)}w
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No engineers assigned</p>
        )}
      </div>

      {/* Product Support Section */}
      <div className="space-y-2 mt-3">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Product Support
        </div>
        {pitch.productManagerName ? (
          <div className="flex items-center gap-2 bg-gray-800/50 rounded px-2.5 py-1.5">
            <div className="w-5 h-5 rounded bg-violet-600/30 flex items-center justify-center text-violet-400 text-xs font-medium">
              {pitch.productManagerName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <span className="text-sm text-gray-300">{pitch.productManagerName}</span>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No product support</p>
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
            <svg
              className="w-6 h-6 text-gray-500"
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
          <p className="text-gray-400">{error || "Cycle not found"}</p>
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
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
              <svg
                className="w-5 h-5 text-gray-900"
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {sortedPitches.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gray-800 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-500"
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
            <p className="text-gray-500">No pitches in this cycle yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pods with their pitches */}
            {cycle.pods.map((pod) => {
              const podPitches = sortedPitches.filter((p) => p.podId === pod.id);
              if (podPitches.length === 0) return null;

              return (
                <div key={pod.id} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-gray-300">{pod.name}</h3>
                    {pod.leaderName && (
                      <span className="text-xs text-gray-500">
                        Lead: {pod.leaderName}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4 border-l border-gray-800">
                    {podPitches.map((pitch) => (
                      <PitchCard key={pitch.id} pitch={pitch} />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Ungrouped pitches */}
            {sortedPitches.filter((p) => !p.podId).length > 0 && (
              <div className="space-y-4">
                {cycle.pods.length > 0 && (
                  <h3 className="text-sm font-medium text-gray-500">Ungrouped</h3>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedPitches
                    .filter((p) => !p.podId)
                    .map((pitch) => (
                      <PitchCard key={pitch.id} pitch={pitch} />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
