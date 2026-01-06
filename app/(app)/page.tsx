"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CycleSummary } from "@/lib/types";
import toast from "react-hot-toast";
import clsx from "clsx";

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CyclesPage() {
  const router = useRouter();
  const [cycles, setCycles] = useState<CycleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCycles();
  }, []);

  // Listen for cycle created event from layout to refresh the list
  useEffect(() => {
    const handleCycleCreated = () => fetchCycles();
    window.addEventListener("cycleCreated", handleCycleCreated);
    return () => window.removeEventListener("cycleCreated", handleCycleCreated);
  }, []);

  async function fetchCycles() {
    try {
      const res = await fetch("/api/cycles");
      if (!res.ok) throw new Error("Failed to fetch cycles");
      const data = await res.json();
      setCycles(data);
    } catch {
      toast.error("Failed to load cycles");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    window.dispatchEvent(new CustomEvent("openCreateCycle"));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-gray-300 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Cycles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Plan and manage your engineering cycles
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Cycle
        </button>
      </div>

      {/* Cycles Table */}
      {cycles.length === 0 ? (
        <div className="card p-12 text-center">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-100">No cycles yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first cycle to get started
          </p>
          <button
            onClick={openCreateModal}
            className="btn-primary mt-4"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Cycle
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cycle
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Range
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pitches
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Required
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {cycles.map((cycle) => (
                  <tr
                    key={cycle.id}
                    onClick={() => router.push(`/cycles/${cycle.id}`)}
                    className="hover:bg-gray-800/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <div className="font-medium text-gray-100 group-hover:text-white transition-colors">
                          {cycle.name}
                        </div>
                        {cycle.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {cycle.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400">
                      {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm text-gray-400">
                        {cycle.pitchCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm text-gray-400">
                        {cycle.totalAvailableWeeks.toFixed(1)}w
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm text-gray-400">
                        {cycle.totalRequiredWeeks.toFixed(1)}w
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={clsx(
                          "inline-flex items-center px-2.5 py-1 rounded text-xs font-bold",
                          cycle.surplusOrDeficit >= 0
                            ? "bg-emerald-500/25 text-emerald-400"
                            : "bg-red-500/25 text-red-400"
                        )}
                      >
                        {cycle.surplusOrDeficit >= 0 ? "+" : ""}
                        {cycle.surplusOrDeficit.toFixed(1)}w
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
