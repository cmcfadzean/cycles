"use client";

import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

interface InlineWeeksEditorProps {
  pitchId: string;
  estimateWeeks: number;
  onUpdate?: () => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export function InlineWeeksEditor({
  pitchId,
  estimateWeeks,
  onUpdate,
  disabled,
  className,
  compact,
}: InlineWeeksEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [weeksValue, setWeeksValue] = useState(estimateWeeks.toString());
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external changes
  useEffect(() => {
    if (!isEditing) {
      setWeeksValue(estimateWeeks.toString());
    }
  }, [estimateWeeks, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  async function handleSave() {
    const newWeeks = parseFloat(weeksValue);
    if (isNaN(newWeeks) || newWeeks < 0) {
      setWeeksValue(estimateWeeks.toString());
      setIsEditing(false);
      return;
    }

    if (newWeeks === estimateWeeks) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/pitches/${pitchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateWeeks: newWeeks }),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }

      toast.success("Estimate updated");
      onUpdate?.();
    } catch {
      toast.error("Failed to update estimate");
      setWeeksValue(estimateWeeks.toString());
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setWeeksValue(estimateWeeks.toString());
      setIsEditing(false);
    }
  }

  if (disabled) {
    return (
      <span className={className}>
        {estimateWeeks > 0 ? `${Number(estimateWeeks).toFixed(1)}w` : "—"}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          step="0.5"
          min="0"
          className="w-16 px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-violet-500"
          value={weeksValue}
          onChange={(e) => setWeeksValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
        />
        <span className="text-sm text-gray-400">w</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={
        compact
          ? `hover:text-gray-100 hover:underline transition-colors cursor-pointer ${className || ""}`
          : "text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
      }
      title="Click to edit estimate"
    >
      {estimateWeeks > 0 ? `${Number(estimateWeeks).toFixed(1)}w` : "—"}
    </button>
  );
}

