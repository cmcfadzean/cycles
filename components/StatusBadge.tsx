"use client";

import { PitchStatus } from "@/lib/types";
import clsx from "clsx";

const statusConfig: Record<
  PitchStatus,
  { label: string; className: string }
> = {
  PLANNED: {
    label: "Planned",
    className: "bg-slate-100 text-slate-700",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-sky-100 text-sky-700",
  },
  DONE: {
    label: "Done",
    className: "bg-emerald-100 text-emerald-700",
  },
  DROPPED: {
    label: "Dropped",
    className: "bg-red-100 text-red-700",
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

