"use client";

import { PitchStatus } from "@/lib/types";
import clsx from "clsx";

const statusConfig: Record<
  PitchStatus,
  { label: string; className: string }
> = {
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
