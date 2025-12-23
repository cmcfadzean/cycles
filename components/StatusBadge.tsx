"use client";

import { PitchStatus } from "@/lib/types";
import clsx from "clsx";

const statusConfig: Record<
  PitchStatus,
  { label: string; className: string }
> = {
  PLANNED: {
    label: "Planned",
    className: "bg-gray-800 text-gray-400 border border-gray-700",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-primary-500/15 text-primary-400 border border-primary-500/20",
  },
  DONE: {
    label: "Done",
    className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  },
  DROPPED: {
    label: "Dropped",
    className: "bg-gray-800 text-gray-500 border border-gray-700 line-through",
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
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
