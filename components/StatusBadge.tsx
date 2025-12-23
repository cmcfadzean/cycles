"use client";

import { PitchStatus } from "@/lib/types";
import clsx from "clsx";

const statusConfig: Record<
  PitchStatus,
  { label: string; className: string }
> = {
  PLANNED: {
    label: "Planned",
    className: "bg-gray-700 text-gray-300",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-violet-500/20 text-violet-400",
  },
  DONE: {
    label: "Done",
    className: "bg-emerald-500/20 text-emerald-400",
  },
  DROPPED: {
    label: "Dropped",
    className: "bg-gray-700 text-gray-500 line-through",
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
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
