"use client";

import { PitchStatus } from "@/lib/types";
import clsx from "clsx";
import { useState, useRef, useEffect } from "react";

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

// Only show current statuses in the dropdown (not legacy ones)
const editableStatuses: PitchStatus[] = [
  "BACKLOG",
  "PLANNING",
  "READY_FOR_DEV",
  "COMPLETE",
  "CANCELED",
];

interface StatusBadgeProps {
  status: PitchStatus;
  className?: string;
  onChange?: (newStatus: PitchStatus) => void;
  disabled?: boolean;
}

export function StatusBadge({ status, className, onChange, disabled }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const config = statusConfig[status] || defaultStatus;
  const isEditable = !!onChange && !disabled;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  function handleStatusChange(newStatus: PitchStatus) {
    if (onChange && newStatus !== status) {
      onChange(newStatus);
    }
    setIsOpen(false);
  }

  if (!isEditable) {
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

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-all",
          "hover:ring-2 hover:ring-gray-600 cursor-pointer",
          config.className,
          className
        )}
      >
        {config.label}
        <svg
          className={clsx(
            "w-3 h-3 transition-transform",
            isOpen && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-40 rounded-lg bg-gray-800 border border-gray-700 shadow-xl py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {editableStatuses.map((statusOption) => {
            const optionConfig = statusConfig[statusOption];
            const isSelected = statusOption === status;
            
            return (
              <button
                key={statusOption}
                type="button"
                onClick={() => handleStatusChange(statusOption)}
                className={clsx(
                  "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors",
                  isSelected
                    ? "bg-gray-700/50 text-gray-100"
                    : "text-gray-300 hover:bg-gray-700/30"
                )}
              >
                <span
                  className={clsx(
                    "w-2 h-2 rounded-full",
                    statusOption === "BACKLOG" && "bg-gray-400",
                    statusOption === "PLANNING" && "bg-blue-400",
                    statusOption === "READY_FOR_DEV" && "bg-violet-400",
                    statusOption === "COMPLETE" && "bg-emerald-400",
                    statusOption === "CANCELED" && "bg-gray-500"
                  )}
                />
                {optionConfig.label}
                {isSelected && (
                  <svg className="w-4 h-4 ml-auto text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
