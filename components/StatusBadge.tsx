"use client";

import { PitchStatus } from "@/lib/types";
import clsx from "clsx";

const statusConfig: Record<
  PitchStatus,
  { label: string; className: string }
> = {
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

interface StatusBadgeProps {
  status: PitchStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
