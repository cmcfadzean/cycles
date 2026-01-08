"use client";

import { PitchStatus } from "@/lib/types";
import clsx from "clsx";

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  // New statuses
  BACKLOG: {
    label: "Backlog",
    className: "bg-gray-700 text-gray-300",
  },
  PLANNING: {
    label: "Planning",
    className: "bg-blue-500/20 text-blue-400",
  },
  READY_FOR_DEV: {
    label: "Ready for Dev",
    className: "bg-violet-500/20 text-violet-400",
  },
  COMPLETE: {
    label: "Complete",
    className: "bg-emerald-500/20 text-emerald-400",
  },
  CANCELED: {
    label: "Canceled",
    className: "bg-gray-700 text-gray-500 line-through",
  },
  // Legacy statuses (for existing data)
  PLANNED: {
    label: "Backlog",
    className: "bg-gray-700 text-gray-300",
  },
  IN_PROGRESS: {
    label: "Ready for Dev",
    className: "bg-violet-500/20 text-violet-400",
  },
  DONE: {
    label: "Complete",
    className: "bg-emerald-500/20 text-emerald-400",
  },
  DROPPED: {
    label: "Canceled",
    className: "bg-gray-700 text-gray-500 line-through",
  },
};

const defaultStatus = {
  label: "Unknown",
  className: "bg-gray-700 text-gray-300",
};

interface StatusBadgeProps {
  status: PitchStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || defaultStatus;

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
