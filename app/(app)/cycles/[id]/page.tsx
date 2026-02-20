"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { InlineWeeksEditor } from "@/components/InlineWeeksEditor";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  CycleDetail,
  EngineerWithCapacity,
  PitchWithAssignments,
  PitchStatus,
  Pod,
  BettingPitch,
} from "@/lib/types";
import toast from "react-hot-toast";
import clsx from "clsx";

interface Engineer {
  id: string;
  name: string;
  email: string | null;
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Draggable Engineer Card
function DraggableEngineerCard({
  engineer,
  isDragging,
  onEdit,
  onDelete,
}: {
  engineer: EngineerWithCapacity;
  isDragging?: boolean;
  onEdit: (engineer: EngineerWithCapacity) => void;
  onDelete: (engineer: EngineerWithCapacity) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `engineer-${engineer.id}`,
    data: { engineer },
  });

  const capacityPercentage =
    engineer.availableWeeks > 0
      ? ((engineer.availableWeeks - engineer.remainingWeeks) /
          engineer.availableWeeks) *
        100
      : 0;

  const getCapacityColor = () => {
    const remainingPercentage =
      (engineer.remainingWeeks / engineer.availableWeeks) * 100;
    if (remainingPercentage < 0) return "bg-red-500";
    if (remainingPercentage <= 20) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={clsx(
        "card p-3 transition-all duration-200 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        engineer.remainingWeeks <= 0 && "opacity-60"
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-gray-300 text-xs font-medium shrink-0">
            {engineer.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <span className="text-sm font-medium text-gray-100 truncate">{engineer.name}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(engineer);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
            title="Edit engineer"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(engineer);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
            title="Remove from cycle"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="space-y-1">
        <div className="progress-bar h-1.5">
          <div
            className={clsx("progress-bar-fill", getCapacityColor())}
            style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            {(engineer.availableWeeks - engineer.remainingWeeks).toFixed(1)}w / {engineer.availableWeeks.toFixed(1)}w
          </span>
          <span
            className={clsx(
              "font-medium",
              engineer.remainingWeeks < 0
                ? "text-red-400"
                : engineer.remainingWeeks <= engineer.availableWeeks * 0.2
                  ? "text-amber-400"
                  : "text-emerald-400"
            )}
          >
            {engineer.remainingWeeks.toFixed(1)}w left
          </span>
        </div>
      </div>
    </div>
  );
}

// Droppable Pitch Card
function DroppablePitchCard({
  pitch,
  cycleId,
  onAssignmentDelete,
  onAssignmentUpdate,
  onEdit,
  onStatusChange,
  onWeeksUpdate,
  isOver,
}: {
  pitch: PitchWithAssignments;
  cycleId: string;
  onAssignmentDelete: (id: string) => void;
  onAssignmentUpdate: (id: string, weeks: number) => void;
  onEdit: (pitch: PitchWithAssignments) => void;
  onStatusChange: (pitchId: string, newStatus: PitchStatus) => void;
  onWeeksUpdate: () => void;
  isOver?: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `pitch-${pitch.id}`,
    data: { pitch },
  });

  const filledPercentage =
    pitch.estimateWeeks > 0
      ? (pitch.assignedWeeks / pitch.estimateWeeks) * 100
      : 0;

  const getStatusColor = () => {
    if (pitch.remainingWeeks < 0) return "bg-red-500";
    if (pitch.remainingWeeks === 0) return "bg-emerald-500";
    return "bg-amber-500";
  };

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "card p-5 transition-all duration-200",
        isOver && "ring-2 ring-primary-400 ring-offset-2 ring-offset-gray-900 bg-primary-900/30"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {pitch.priority && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-700 text-xs font-semibold text-gray-300">
                {pitch.priority}
              </span>
            )}
            {pitch.pitchDocUrl ? (
              <a
                href={pitch.pitchDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gray-100 hover:text-primary-400 transition-colors truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {pitch.title}
                <svg
                  className="w-3.5 h-3.5 inline ml-1"
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
              <span className="font-semibold text-gray-100 truncate">
                {pitch.title}
              </span>
            )}
          </div>
          <StatusBadge 
            status={pitch.status} 
            onChange={(newStatus) => onStatusChange(pitch.id, newStatus)}
          />
        </div>
        <button
          onClick={() => onEdit(pitch)}
          className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
          title="Edit pitch"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {pitch.notes && (
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">{pitch.notes}</p>
      )}

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Estimate</span>
          <InlineWeeksEditor
            pitchId={pitch.id}
            estimateWeeks={Number(pitch.estimateWeeks)}
            onUpdate={onWeeksUpdate}
            className="font-medium text-gray-200"
            compact
          />
        </div>

        <div className="progress-bar h-2.5">
          <div
            className={clsx("progress-bar-fill", getStatusColor())}
            style={{ width: `${Math.min(filledPercentage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Assigned</span>
          <span className="font-medium text-gray-200">
            {pitch.assignedWeeks.toFixed(1)}w
          </span>
        </div>
      </div>

      {pitch.remainingWeeks !== 0 && (
        <div
          className={clsx(
            "text-xs text-center font-medium rounded-lg py-1.5 mb-4",
            pitch.remainingWeeks > 0
              ? "text-amber-400 bg-amber-500/20"
              : "text-red-400 bg-red-500/20"
          )}
        >
          {pitch.remainingWeeks > 0
            ? `${pitch.remainingWeeks.toFixed(1)}w unassigned`
            : `Over by ${Math.abs(pitch.remainingWeeks).toFixed(1)}w`}
        </div>
      )}

      {pitch.remainingWeeks === 0 && (
        <div className="text-xs text-center font-semibold rounded py-1.5 mb-4 text-emerald-400 bg-emerald-500/20">
          Fully staffed
        </div>
      )}

      {/* Engineers Section */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Engineers
        </div>
        {pitch.assignments.length > 0 ? (
          <div className="space-y-2">
            {pitch.assignments.map((assignment) => (
              <AssignmentPill
                key={assignment.id}
                assignment={assignment}
                onDelete={() => onAssignmentDelete(assignment.id)}
                onUpdate={(weeks) => onAssignmentUpdate(assignment.id, weeks)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-4 border-2 border-dashed border-gray-600 rounded-lg">
            <svg
              className="w-6 h-6 mx-auto text-gray-500 mb-2"
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
            <p className="text-sm text-gray-500">
              Drag an engineer here to assign
            </p>
          </div>
        )}
      </div>

      {/* Product Support Section */}
      <div className="space-y-2 mt-4">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Product Support
        </div>
        {pitch.productManagerName ? (
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
            <div className="w-6 h-6 rounded-md bg-violet-600/20 flex items-center justify-center text-violet-400 text-xs font-medium">
              {pitch.productManagerName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <span className="text-sm text-gray-200">{pitch.productManagerName}</span>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No product support</p>
        )}
      </div>

      {/* Design Support Section */}
      <div className="space-y-2 mt-4">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Design Support
        </div>
        {pitch.productDesignerName ? (
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
            <div className="w-6 h-6 rounded-md bg-pink-600/20 flex items-center justify-center text-pink-400 text-xs font-medium">
              {pitch.productDesignerName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <span className="text-sm text-gray-200">{pitch.productDesignerName}</span>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No design support</p>
        )}
      </div>
    </div>
  );
}

// Role Avatar (for PM/Designer) with Popover for removing
function RoleAvatar({
  name,
  role,
  color,
  onRemove,
}: {
  name: string;
  role: "Product Manager" | "Product Designer";
  color: "violet" | "pink";
  onRemove: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Update position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isOpen]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");

  const colorClasses = color === "violet"
    ? "bg-violet-600 text-white hover:bg-violet-500"
    : "bg-pink-600 text-white hover:bg-pink-500";

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={clsx(
          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all hover:scale-110",
          colorClasses
        )}
        title={`${role}: ${name}`}
      >
        {initials}
      </button>

      {/* Popover - rendered via portal to escape overflow */}
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[9999]"
          style={{
            top: position.top,
            left: position.left,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 min-w-[140px]">
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-800" />
            
            {/* Header with delete icon */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">{role}</div>
                <div className="font-medium text-gray-100 text-sm">{name}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                  setIsOpen(false);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors -mt-1 -mr-1"
                title="Remove from pitch"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Engineer Avatar with Popover for editing weeks
function EngineerAvatar({
  assignment,
  onUpdate,
  onDelete,
}: {
  assignment: {
    id: string;
    engineerId: string;
    engineerName: string;
    weeksAllocated: number;
  };
  onUpdate: (id: string, weeks: number) => void;
  onDelete: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [weeks, setWeeks] = useState(assignment.weeksAllocated.toString());
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Update position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8, // Position above the button
        left: rect.left + rect.width / 2,
      });
    }
  }, [isOpen]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const initials = assignment.engineerName
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={clsx(
          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all",
          "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-110"
        )}
        title={`${assignment.engineerName} - ${assignment.weeksAllocated}w`}
      >
        {initials}
      </button>

      {/* Popover - rendered via portal to escape overflow */}
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[9999]"
          style={{
            top: position.top,
            left: position.left,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 min-w-[180px]">
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-800" />
            
            {/* Header with name and delete icon */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="font-medium text-gray-100 text-sm">
                {assignment.engineerName}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(assignment.id);
                  setIsOpen(false);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors -mt-1 -mr-1"
                title="Remove from pitch"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Weeks Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Weeks:</span>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={weeks}
                onChange={(e) => {
                  setWeeks(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    onUpdate(assignment.id, val);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-16 h-7 text-center text-sm bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Kanban Pitch Card - Draggable and Droppable (compact version for Kanban columns)
function KanbanPitchCard({
  pitch,
  cycleId,
  onAssignmentDelete,
  onAssignmentUpdate,
  onEdit,
  onStatusChange,
  onWeeksUpdate,
  onPitchUpdate,
  isOver,
  isDragging,
}: {
  pitch: PitchWithAssignments;
  cycleId: string;
  onAssignmentDelete: (id: string) => void;
  onAssignmentUpdate: (id: string, weeks: number) => void;
  onEdit: (pitch: PitchWithAssignments) => void;
  onStatusChange: (pitchId: string, newStatus: PitchStatus) => void;
  onWeeksUpdate: () => void;
  onPitchUpdate: (pitchId: string, data: { productManagerId?: string | null; productDesignerId?: string | null }) => void;
  isOver?: boolean;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, transform } = useDraggable({
    id: `draggable-pitch-${pitch.id}`,
    data: { pitch },
  });
  
  const { setNodeRef: setDropRef } = useDroppable({
    id: `pitch-${pitch.id}`,
    data: { pitch },
  });

  // Combine refs for both draggable and droppable
  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const filledPercentage =
    pitch.estimateWeeks > 0
      ? (pitch.assignedWeeks / pitch.estimateWeeks) * 100
      : 0;

  const getStatusColor = () => {
    if (pitch.remainingWeeks < 0) return "bg-red-500";
    if (pitch.remainingWeeks === 0) return "bg-emerald-500";
    return "bg-amber-500";
  };

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "card p-4 transition-all duration-200 cursor-grab active:cursor-grabbing",
        isOver && "ring-2 ring-primary-400 ring-offset-2 ring-offset-gray-900 bg-primary-900/30",
        isDragging && "opacity-50 shadow-2xl"
      )}
      {...listeners}
      {...attributes}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {pitch.priority && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-700 text-xs font-semibold text-gray-300">
                {pitch.priority}
              </span>
            )}
            {pitch.pitchDocUrl ? (
              <a
                href={pitch.pitchDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sm text-gray-100 hover:text-primary-400 transition-colors truncate"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {pitch.title}
              </a>
            ) : (
              <span className="font-semibold text-sm text-gray-100 truncate">
                {pitch.title}
              </span>
            )}
          </div>
          <StatusBadge 
            status={pitch.status} 
            onChange={(newStatus) => onStatusChange(pitch.id, newStatus)}
          />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(pitch);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
          title="Edit pitch"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {/* Progress */}
      <div className="space-y-2 mb-3">
        <div className="progress-bar h-2">
          <div
            className={clsx("progress-bar-fill", getStatusColor())}
            style={{ width: `${Math.min(filledPercentage, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            {pitch.assignedWeeks.toFixed(1)}w / {Number(pitch.estimateWeeks).toFixed(1)}w
          </span>
          {pitch.remainingWeeks > 0 && (
            <span className="text-amber-400">{pitch.remainingWeeks.toFixed(1)}w left</span>
          )}
          {pitch.remainingWeeks === 0 && (
            <span className="text-emerald-400">Staffed</span>
          )}
          {pitch.remainingWeeks < 0 && (
            <span className="text-red-400">Over by {Math.abs(pitch.remainingWeeks).toFixed(1)}w</span>
          )}
        </div>
      </div>

      {/* Team Avatars - PM, Designer, Engineers */}
      <div className="flex flex-wrap gap-1 items-center">
        {/* Product Manager */}
        {pitch.productManagerName && (
          <RoleAvatar
            name={pitch.productManagerName}
            role="Product Manager"
            color="violet"
            onRemove={() => onPitchUpdate(pitch.id, { productManagerId: null })}
          />
        )}
        
        {/* Product Designer */}
        {pitch.productDesignerName && (
          <RoleAvatar
            name={pitch.productDesignerName}
            role="Product Designer"
            color="pink"
            onRemove={() => onPitchUpdate(pitch.id, { productDesignerId: null })}
          />
        )}
        
        {/* Engineers */}
        {pitch.assignments.map((assignment) => (
          <EngineerAvatar
            key={assignment.id}
            assignment={assignment}
            onUpdate={onAssignmentUpdate}
            onDelete={onAssignmentDelete}
          />
        ))}
        
        {/* Empty state */}
        {!pitch.productManagerName && !pitch.productDesignerName && pitch.assignments.length === 0 && (
          <div className="w-full text-center py-2 border border-dashed border-gray-600 rounded text-xs text-gray-500">
            Drop engineer here
          </div>
        )}
      </div>
    </div>
  );
}

// Pitch Drag Overlay
function PitchDragOverlay({
  pitch,
}: {
  pitch: PitchWithAssignments | null;
}) {
  if (!pitch) return null;

  return (
    <div className="card p-4 shadow-2xl scale-105 cursor-grabbing w-72 bg-gray-800/95 backdrop-blur-sm border border-gray-600">
      <div className="font-semibold text-sm text-gray-100 truncate mb-2">
        {pitch.title}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{pitch.assignedWeeks.toFixed(1)}w / {Number(pitch.estimateWeeks).toFixed(1)}w</span>
        <span>{pitch.assignments.length} engineer{pitch.assignments.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

// Sortable Kanban Column wrapper for pods
function SortableKanbanColumn({
  pod,
  children,
}: {
  pod: Pod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: (dragHandleProps: { listeners: any; attributes: any }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `sortable-pod-${pod.id}`,
    data: { pod },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ listeners, attributes })}
    </div>
  );
}

// Kanban Column
function KanbanColumn({
  id,
  title,
  subtitle,
  pitches,
  cycleId,
  onAssignmentDelete,
  onAssignmentUpdate,
  onEditPitch,
  onPitchStatusChange,
  onWeeksUpdate,
  onPitchUpdate,
  dropTargetPitchId,
  activePitchId,
  onAddPitch,
  onEditPod,
  onDeletePod,
  isAdmin,
  isOver,
  dragHandleProps,
}: {
  id: string;
  title: string;
  subtitle?: string;
  pitches: PitchWithAssignments[];
  cycleId: string;
  onAssignmentDelete: (id: string) => void;
  onAssignmentUpdate: (id: string, weeks: number) => void;
  onEditPitch: (pitch: PitchWithAssignments) => void;
  onPitchStatusChange: (pitchId: string, newStatus: PitchStatus) => void;
  onWeeksUpdate: () => void;
  onPitchUpdate: (pitchId: string, data: { productManagerId?: string | null; productDesignerId?: string | null }) => void;
  dropTargetPitchId: string | null;
  activePitchId: string | null;
  onAddPitch?: () => void;
  onEditPod?: () => void;
  onDeletePod?: () => void;
  isAdmin?: boolean;
  isOver?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleProps?: { listeners: any; attributes: any };
}) {
  const { setNodeRef } = useDroppable({
    id: `column-${id}`,
    data: { columnId: id },
  });

  const totalWeeks = pitches.reduce((sum, p) => sum + Number(p.estimateWeeks), 0);
  const assignedWeeks = pitches.reduce((sum, p) => sum + p.assignedWeeks, 0);

  return (
    <div
      className={clsx(
        "flex flex-col w-80 min-w-80 bg-gray-800/30 rounded-xl border transition-all",
        isOver ? "border-primary-500 bg-primary-900/20" : "border-gray-700/50"
      )}
    >
      {/* Column Header - drag handle */}
      <div 
        className={clsx(
          "p-4 border-b border-gray-700/50",
          dragHandleProps && "cursor-grab active:cursor-grabbing"
        )}
        {...(dragHandleProps?.listeners || {})}
        {...(dragHandleProps?.attributes || {})}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-100">{title}</h3>
          <div className="flex items-center gap-1">
            {onEditPod && (
              <button
                onClick={onEditPod}
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
                title="Edit pod"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {onDeletePod && isAdmin && (
              <button
                onClick={onDeletePod}
                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                title="Delete pod"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {subtitle && (
          <div className="text-xs text-primary-400 mb-2">{subtitle}</div>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{pitches.length} pitch{pitches.length !== 1 ? "es" : ""}</span>
          <span>•</span>
          <span>{assignedWeeks.toFixed(1)}w / {totalWeeks.toFixed(1)}w</span>
        </div>
      </div>

      {/* Pitches - droppable area */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {pitches.map((pitch) => (
          <KanbanPitchCard
            key={pitch.id}
            pitch={pitch}
            cycleId={cycleId}
            onAssignmentDelete={onAssignmentDelete}
            onAssignmentUpdate={onAssignmentUpdate}
            onEdit={onEditPitch}
            onStatusChange={onPitchStatusChange}
            onWeeksUpdate={onWeeksUpdate}
            onPitchUpdate={onPitchUpdate}
            isOver={dropTargetPitchId === pitch.id}
            isDragging={activePitchId === pitch.id}
          />
        ))}
        
        {pitches.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            <p>No pitches</p>
            <p className="text-xs mt-1">Drag pitches here</p>
          </div>
        )}
      </div>

      {/* Add Pitch Button */}
      {onAddPitch && (
        <div className="p-3 border-t border-gray-700/50">
          <button
            onClick={onAddPitch}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Pitch
          </button>
        </div>
      )}
    </div>
  );
}

// Assignment Pill
function AssignmentPill({
  assignment,
  onDelete,
  onUpdate,
}: {
  assignment: {
    id: string;
    engineerId: string;
    engineerName: string;
    weeksAllocated: number;
  };
  onDelete: () => void;
  onUpdate: (weeks: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [weeks, setWeeks] = useState(assignment.weeksAllocated.toString());

  const handleSave = () => {
    const newWeeks = parseFloat(weeks);
    if (!isNaN(newWeeks) && newWeeks > 0) {
      onUpdate(newWeeks);
    } else {
      setWeeks(assignment.weeksAllocated.toString());
    }
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2 group">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-gray-700 flex items-center justify-center text-gray-300 text-xs font-medium">
          {assignment.engineerName
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <span className="text-sm font-medium text-gray-200">
          {assignment.engineerName}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setWeeks(assignment.weeksAllocated.toString());
                setIsEditing(false);
              }
            }}
            className="w-16 text-sm font-medium text-gray-100 bg-gray-800 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-600"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-semibold text-primary-400 hover:text-primary-300 px-2 py-1 rounded hover:bg-primary-900/30 transition-colors"
          >
            {assignment.weeksAllocated.toFixed(1)}w
          </button>
        )}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Engineer Drag Overlay
function EngineerDragOverlay({
  engineer,
}: {
  engineer: EngineerWithCapacity | null;
}) {
  if (!engineer) return null;

  return (
    <div className="card p-4 shadow-2xl scale-105 cursor-grabbing w-64 bg-gray-800/95 backdrop-blur-sm border border-gray-600">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-gray-700 flex items-center justify-center text-gray-300 text-sm font-medium">
          {engineer.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <div className="font-semibold text-gray-100">{engineer.name}</div>
          <div className="text-xs text-gray-400">
            {engineer.remainingWeeks.toFixed(1)}w available
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CycleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin } = useIsAdmin();
  const cycleId = params.id as string;

  const [cycle, setCycle] = useState<CycleDetail | null>(null);
  const [allEngineers, setAllEngineers] = useState<Engineer[]>([]);
  const [allProductManagers, setAllProductManagers] = useState<{ id: string; name: string }[]>([]);
  const [allProductDesigners, setAllProductDesigners] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"main" | "betting" | "signups">("main");

  const [activeEngineer, setActiveEngineer] =
    useState<EngineerWithCapacity | null>(null);
  const [activePitch, setActivePitch] = useState<PitchWithAssignments | null>(null);
  const [dropTargetPitchId, setDropTargetPitchId] = useState<string | null>(
    null
  );
  const [dropTargetColumnId, setDropTargetColumnId] = useState<string | null>(null);

  // Modal states
  const [isAddEngineerModalOpen, setIsAddEngineerModalOpen] = useState(false);
  const [isEditEngineerModalOpen, setIsEditEngineerModalOpen] = useState(false);
  const [isDeleteEngineerModalOpen, setIsDeleteEngineerModalOpen] = useState(false);
  const [isAddPitchModalOpen, setIsAddPitchModalOpen] = useState(false);
  const [isEditPitchModalOpen, setIsEditPitchModalOpen] = useState(false);
  const [isEditCycleModalOpen, setIsEditCycleModalOpen] = useState(false);
  const [isDeleteCycleModalOpen, setIsDeleteCycleModalOpen] = useState(false);
  const [deleteCycleConfirmation, setDeleteCycleConfirmation] = useState("");
  const [isCreatePodModalOpen, setIsCreatePodModalOpen] = useState(false);
  const [isEditPodModalOpen, setIsEditPodModalOpen] = useState(false);
  const [isDeletePodModalOpen, setIsDeletePodModalOpen] = useState(false);
  const [editingPod, setEditingPod] = useState<Pod | null>(null);
  const [podToDelete, setPodToDelete] = useState<Pod | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{
    engineer: EngineerWithCapacity;
    pitch: PitchWithAssignments;
  } | null>(null);
  const [assignmentWeeks, setAssignmentWeeks] = useState("");
  const [editingPitch, setEditingPitch] = useState<PitchWithAssignments | null>(null);
  const [isAddToBettingModalOpen, setIsAddToBettingModalOpen] = useState(false);
  const [selectedBettingPitches, setSelectedBettingPitches] = useState<Set<string>>(new Set());
  const [editingEngineer, setEditingEngineer] = useState<EngineerWithCapacity | null>(null);
  const [engineerToDelete, setEngineerToDelete] = useState<EngineerWithCapacity | null>(null);

  // Form states
  const [selectedEngineersMap, setSelectedEngineersMap] = useState<Record<string, string>>({});
  const [defaultAvailableWeeks, setDefaultAvailableWeeks] = useState("6");
  const [isCreatingNewEngineer, setIsCreatingNewEngineer] = useState(false);
  const [newEngineerForm, setNewEngineerForm] = useState({
    name: "",
    email: "",
  });
  const [addPitchForm, setAddPitchForm] = useState({
    title: "",
    pitchDocUrl: "",
    estimateWeeks: "",
    priority: "",
    notes: "",
  });
  const [isCreatingNewPitch, setIsCreatingNewPitch] = useState(false);
  const [availablePitches, setAvailablePitches] = useState<Array<{
    id: string;
    title: string;
    estimateWeeks: number;
    priority: number | null;
    pitchDocUrl: string | null;
  }>>([]);

  // Signups state
  const [signups, setSignups] = useState<Array<{
    id: string;
    personName: string;
    firstChoice: { pitchId: string; pitchTitle: string };
    secondChoice: { pitchId: string; pitchTitle: string };
    thirdChoice: { pitchId: string; pitchTitle: string };
    createdAt: string;
  }>>([]);
  const [signupsLoading, setSignupsLoading] = useState(false);
  const [selectedPitchId, setSelectedPitchId] = useState("");
  const [editPitchForm, setEditPitchForm] = useState({
    title: "",
    pitchDocUrl: "",
    estimateWeeks: "",
    status: "BACKLOG" as PitchStatus,
    priority: "",
    notes: "",
    podId: "",
    productManagerId: "",
    productDesignerId: "",
  });
  const [editEngineerForm, setEditEngineerForm] = useState({
    name: "",
    email: "",
    availableWeeks: "",
  });
  const [editCycleForm, setEditCycleForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [podForm, setPodForm] = useState({
    name: "",
    leaderId: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchCycle = useCallback(async () => {
    try {
      const res = await fetch(`/api/cycles/${cycleId}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Cycle not found");
          router.push("/");
          return;
        }
        throw new Error("Failed to fetch cycle");
      }
      const data = await res.json();
      setCycle(data);
    } catch {
      toast.error("Failed to load cycle");
    } finally {
      setLoading(false);
    }
  }, [cycleId, router]);

  const fetchEngineers = useCallback(async () => {
    try {
      const res = await fetch("/api/engineers");
      if (!res.ok) throw new Error("Failed to fetch engineers");
      const data = await res.json();
      setAllEngineers(data);
    } catch {
      console.error("Failed to load engineers");
    }
  }, []);

  const fetchAvailablePitches = useCallback(async () => {
    try {
      const res = await fetch("/api/pitches?status=available");
      if (!res.ok) throw new Error("Failed to fetch pitches");
      const data = await res.json();
      setAvailablePitches(data);
    } catch {
      console.error("Failed to load available pitches");
    }
  }, []);

  const fetchSignups = useCallback(async () => {
    setSignupsLoading(true);
    try {
      const res = await fetch(`/api/cycles/${cycleId}/signup/results`);
      if (!res.ok) throw new Error("Failed to fetch signups");
      const data = await res.json();
      setSignups(data);
    } catch {
      console.error("Failed to load signups");
    } finally {
      setSignupsLoading(false);
    }
  }, [cycleId]);

  const fetchProductManagers = useCallback(async () => {
    try {
      const res = await fetch("/api/product-managers");
      if (!res.ok) throw new Error("Failed to fetch product managers");
      const data = await res.json();
      setAllProductManagers(data);
    } catch {
      console.error("Failed to load product managers");
    }
  }, []);

  const fetchProductDesigners = useCallback(async () => {
    try {
      const res = await fetch("/api/product-designers");
      if (!res.ok) throw new Error("Failed to fetch product designers");
      const data = await res.json();
      setAllProductDesigners(data);
    } catch {
      console.error("Failed to load product designers");
    }
  }, []);

  useEffect(() => {
    fetchCycle();
    fetchEngineers();
    fetchAvailablePitches();
    fetchProductManagers();
    fetchProductDesigners();
  }, [fetchCycle, fetchEngineers, fetchAvailablePitches, fetchProductManagers, fetchProductDesigners]);

  // Fetch signups when the signups tab is activated
  useEffect(() => {
    if (activeTab === "signups") {
      fetchSignups();
    }
  }, [activeTab, fetchSignups]);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const engineer = active.data.current?.engineer as EngineerWithCapacity;
    const pitch = active.data.current?.pitch as PitchWithAssignments;
    
    if (engineer) {
      setActiveEngineer(engineer);
    } else if (pitch) {
      setActivePitch(pitch);
    }
  }

  function handleDragOver(event: DragEndEvent) {
    const { over } = event;
    
    // Handle engineer over pitch
    if (over && over.id.toString().startsWith("pitch-")) {
      const pitchId = over.id.toString().replace("pitch-", "");
      setDropTargetPitchId(pitchId);
      setDropTargetColumnId(null);
    } 
    // Handle pitch over column
    else if (over && over.id.toString().startsWith("column-")) {
      setDropTargetColumnId(over.id.toString());
      setDropTargetPitchId(null);
    } else {
      setDropTargetPitchId(null);
      setDropTargetColumnId(null);
    }
  }

  async function handlePitchMove(pitchId: string, newPodId: string | null) {
    try {
      const res = await fetch(`/api/pitches/${pitchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ podId: newPodId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to move pitch");
      }

      fetchCycle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move pitch");
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    const wasEngineerDrag = activeEngineer !== null;
    const wasPitchDrag = activePitch !== null;
    
    setActiveEngineer(null);
    setActivePitch(null);
    setDropTargetPitchId(null);
    setDropTargetColumnId(null);

    if (!over) return;

    // Handle pod reordering
    if (active.id.toString().startsWith("sortable-pod-") && over.id.toString().startsWith("sortable-pod-")) {
      const activeId = active.id.toString().replace("sortable-pod-", "");
      const overId = over.id.toString().replace("sortable-pod-", "");
      
      if (activeId !== overId && cycle) {
        const oldIndex = cycle.pods.findIndex((p) => p.id === activeId);
        const newIndex = cycle.pods.findIndex((p) => p.id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newPods = arrayMove(cycle.pods, oldIndex, newIndex);
          // Optimistically update the UI
          setCycle({ ...cycle, pods: newPods });
          // Save to server
          handlePodReorder(newPods.map((p) => p.id));
        }
      }
      return;
    }

    // Handle engineer dropped on pitch
    if (wasEngineerDrag && over.id.toString().startsWith("pitch-")) {
      const engineer = active.data.current?.engineer as EngineerWithCapacity;
      const pitch = over.data.current?.pitch as PitchWithAssignments;

      if (!engineer || !pitch) return;

      // Check if engineer has remaining capacity
      if (engineer.remainingWeeks <= 0) {
        toast.error(`${engineer.name} has no remaining capacity`);
        return;
      }

      // Check if pitch needs more work
      if (pitch.remainingWeeks <= 0) {
        toast.error(`${pitch.title} is already fully staffed`);
        return;
      }

      // Check if already assigned
      const existingAssignment = pitch.assignments.find(
        (a) => a.engineerId === engineer.id
      );
      if (existingAssignment) {
        toast.error(`${engineer.name} is already assigned to this pitch`);
        return;
      }

      // Open assignment modal
      setPendingAssignment({ engineer, pitch });
      const suggestedWeeks = Math.min(
        engineer.remainingWeeks,
        pitch.remainingWeeks
      );
      setAssignmentWeeks(suggestedWeeks.toString());
      setIsAssignModalOpen(true);
    }
    
    // Handle pitch dropped on column
    if (wasPitchDrag && over.id.toString().startsWith("column-")) {
      const pitch = active.data.current?.pitch as PitchWithAssignments;
      const columnId = over.id.toString().replace("column-", "");
      
      if (!pitch) return;
      
      // "unassigned" column means no pod
      const newPodId = columnId === "unassigned" ? null : columnId;
      
      // Only update if pod changed
      if (pitch.podId !== newPodId) {
        handlePitchMove(pitch.id, newPodId);
      }
    }
  }

  async function handlePodReorder(podIds: string[]) {
    try {
      const res = await fetch("/api/pods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ podIds, cycleId }),
      });

      if (!res.ok) {
        throw new Error("Failed to reorder pods");
      }
    } catch (err) {
      toast.error("Failed to save pod order");
      // Refetch to revert optimistic update
      fetchCycle();
    }
  }

  async function handleAssignmentCreate() {
    if (!pendingAssignment) return;

    const weeks = parseFloat(assignmentWeeks);
    if (isNaN(weeks) || weeks <= 0) {
      toast.error("Please enter a valid number of weeks");
      return;
    }

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId,
          engineerId: pendingAssignment.engineer.id,
          pitchId: pendingAssignment.pitch.id,
          weeksAllocated: weeks,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create assignment");
      }

      toast.success(
        `Assigned ${pendingAssignment.engineer.name} to ${pendingAssignment.pitch.title}`
      );
      setIsAssignModalOpen(false);
      setPendingAssignment(null);
      fetchCycle();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create assignment"
      );
    }
  }

  async function handleAssignmentDelete(assignmentId: string) {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete assignment");

      toast.success("Assignment removed");
      fetchCycle();
    } catch {
      toast.error("Failed to remove assignment");
    }
  }

  async function handlePitchStatusChange(pitchId: string, newStatus: PitchStatus) {
    try {
      const res = await fetch(`/api/pitches/${pitchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      toast.success("Status updated");
      fetchCycle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleBettingAction(pitchId: string, action: "approve" | "unapprove" | "reject" | "unreject" | "remove") {
    try {
      const res = await fetch(`/api/cycles/${cycleId}/betting/${pitchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to perform action");
      }

      const messages: Record<string, string> = {
        approve: "Pitch added to cycle",
        unapprove: "Pitch removed from cycle",
        reject: "Pitch rejected",
        unreject: "Pitch moved back to pending",
        remove: "Pitch removed from betting table",
      };
      toast.success(messages[action]);
      fetchCycle();
      fetchAvailablePitches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to perform action");
    }
  }

  async function handleAddToBetting(pitchIds: string[]) {
    if (pitchIds.length === 0) return;

    try {
      // Add all selected pitches in parallel
      const results = await Promise.all(
        pitchIds.map((pitchId) =>
          fetch(`/api/cycles/${cycleId}/betting/${pitchId}`, {
            method: "POST",
          })
        )
      );

      const failedCount = results.filter((r) => !r.ok).length;
      if (failedCount > 0) {
        throw new Error(`Failed to add ${failedCount} pitch(es)`);
      }

      toast.success(
        pitchIds.length === 1
          ? "Pitch added to betting table"
          : `${pitchIds.length} pitches added to betting table`
      );
      setIsAddToBettingModalOpen(false);
      setSelectedBettingPitches(new Set());
      fetchCycle();
      fetchAvailablePitches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add to betting table");
    }
  }

  async function handleAssignmentUpdate(assignmentId: string, weeks: number) {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeksAllocated: weeks }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update assignment");
      }

      toast.success("Assignment updated");
      fetchCycle();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update assignment"
      );
    }
  }

  async function handlePitchUpdate(pitchId: string, data: { productManagerId?: string | null; productDesignerId?: string | null }) {
    try {
      const res = await fetch(`/api/pitches/${pitchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update pitch");
      }

      toast.success("Pitch updated");
      fetchCycle();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update pitch"
      );
    }
  }

  async function handleAddEngineerToCycle(e: React.FormEvent) {
    e.preventDefault();

    const selectedEngineerIds = Object.keys(selectedEngineersMap);
    if (selectedEngineerIds.length === 0) {
      toast.error("Please select at least one engineer");
      return;
    }

    // Validate all weeks values
    for (const engineerId of selectedEngineerIds) {
      const weeks = parseFloat(selectedEngineersMap[engineerId]);
      if (isNaN(weeks) || weeks <= 0) {
        const engineer = availableEngineers.find((e) => e.id === engineerId);
        toast.error(`Please enter valid available weeks for ${engineer?.name || "engineer"}`);
        return;
      }
    }

    try {
      const results = await Promise.all(
        selectedEngineerIds.map(async (engineerId) => {
          const weeks = parseFloat(selectedEngineersMap[engineerId]);
          const res = await fetch(`/api/engineers/${engineerId}/capacities`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cycleId,
              availableWeeks: weeks,
            }),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to add engineer");
          }

          return res.json();
        })
      );

      const count = results.length;
      toast.success(`${count} engineer${count > 1 ? "s" : ""} added to cycle`);
      setIsAddEngineerModalOpen(false);
      setSelectedEngineersMap({});
      setDefaultAvailableWeeks("6");
      fetchCycle();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add engineers"
      );
    }
  }

  async function handleCreateNewEngineer(e: React.FormEvent) {
    e.preventDefault();

    if (!newEngineerForm.name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    const weeks = parseFloat(defaultAvailableWeeks);
    if (isNaN(weeks) || weeks <= 0) {
      toast.error("Please enter valid available weeks");
      return;
    }

    try {
      // First, create the new engineer
      const createRes = await fetch("/api/engineers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEngineerForm.name.trim(),
          email: newEngineerForm.email.trim() || null,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || "Failed to create engineer");
      }

      const newEngineer = await createRes.json();

      // Then, add them to the cycle
      const capacityRes = await fetch(
        `/api/engineers/${newEngineer.id}/capacities`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cycleId,
            availableWeeks: weeks,
          }),
        }
      );

      if (!capacityRes.ok) {
        const data = await capacityRes.json();
        throw new Error(data.error || "Failed to add engineer to cycle");
      }

      toast.success(`${newEngineerForm.name} created and added to cycle`);
      setIsAddEngineerModalOpen(false);
      setIsCreatingNewEngineer(false);
      setNewEngineerForm({ name: "", email: "" });
      setSelectedEngineersMap({});
      setDefaultAvailableWeeks("6");
      fetchCycle();
      fetchEngineers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create engineer"
      );
    }
  }

  async function handleAssignExistingPitch() {
    if (!selectedPitchId) {
      toast.error("Please select a pitch");
      return;
    }

    try {
      const res = await fetch(`/api/pitches/${selectedPitchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign pitch");
      }

      toast.success("Pitch added to cycle");
      setIsAddPitchModalOpen(false);
      setSelectedPitchId("");
      setIsCreatingNewPitch(false);
      fetchCycle();
      fetchAvailablePitches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign pitch");
    }
  }

  async function handleAddPitch(e: React.FormEvent) {
    e.preventDefault();

    const estimateWeeks = parseFloat(addPitchForm.estimateWeeks);
    if (isNaN(estimateWeeks) || estimateWeeks <= 0) {
      toast.error("Please enter valid estimate weeks");
      return;
    }

    try {
      const res = await fetch("/api/pitches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId,
          title: addPitchForm.title,
          pitchDocUrl: addPitchForm.pitchDocUrl || null,
          estimateWeeks,
          priority: addPitchForm.priority
            ? parseInt(addPitchForm.priority)
            : null,
          notes: addPitchForm.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create pitch");
      }

      toast.success("Pitch added to cycle");
      setIsAddPitchModalOpen(false);
      setIsCreatingNewPitch(false);
      setAddPitchForm({
        title: "",
        pitchDocUrl: "",
        estimateWeeks: "",
        priority: "",
        notes: "",
      });
      fetchCycle();
      fetchAvailablePitches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create pitch");
    }
  }

  function handleOpenEditPitch(pitch: PitchWithAssignments) {
    setEditingPitch(pitch);
    setEditPitchForm({
      title: pitch.title,
      pitchDocUrl: pitch.pitchDocUrl || "",
      estimateWeeks: pitch.estimateWeeks.toString(),
      status: pitch.status,
      priority: pitch.priority?.toString() || "",
      notes: pitch.notes || "",
      podId: pitch.podId || "",
      productManagerId: pitch.productManagerId || "",
      productDesignerId: pitch.productDesignerId || "",
    });
    setIsEditPitchModalOpen(true);
  }

  async function handleEditPitch(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPitch) return;

    const estimateWeeks = parseFloat(editPitchForm.estimateWeeks);
    if (isNaN(estimateWeeks) || estimateWeeks <= 0) {
      toast.error("Please enter valid estimate weeks");
      return;
    }

    try {
      const res = await fetch(`/api/pitches/${editingPitch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editPitchForm.title,
          pitchDocUrl: editPitchForm.pitchDocUrl || null,
          estimateWeeks,
          status: editPitchForm.status,
          priority: editPitchForm.priority
            ? parseInt(editPitchForm.priority)
            : null,
          notes: editPitchForm.notes || null,
          podId: editPitchForm.podId || null,
          productManagerId: editPitchForm.productManagerId || null,
          productDesignerId: editPitchForm.productDesignerId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update pitch");
      }

      toast.success("Pitch updated");
      setIsEditPitchModalOpen(false);
      setEditingPitch(null);
      fetchCycle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update pitch");
    }
  }

  function handleOpenEditEngineer(engineer: EngineerWithCapacity) {
    setEditingEngineer(engineer);
    setEditEngineerForm({
      name: engineer.name,
      email: engineer.email || "",
      availableWeeks: engineer.availableWeeks.toString(),
    });
    setIsEditEngineerModalOpen(true);
  }

  async function handleEditEngineer(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEngineer) return;

    if (!editEngineerForm.name.trim()) {
      toast.error("Name is required");
      return;
    }

    const weeks = parseFloat(editEngineerForm.availableWeeks);
    if (isNaN(weeks) || weeks <= 0) {
      toast.error("Please enter valid available weeks");
      return;
    }

    try {
      // Update engineer details
      const res = await fetch(`/api/engineers/${editingEngineer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editEngineerForm.name.trim(),
          email: editEngineerForm.email.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update engineer");
      }

      // Update capacity for this cycle
      const capacityRes = await fetch(
        `/api/engineers/${editingEngineer.id}/capacities/${cycleId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            availableWeeks: weeks,
          }),
        }
      );

      if (!capacityRes.ok) {
        const data = await capacityRes.json();
        throw new Error(data.error || "Failed to update capacity");
      }

      toast.success("Engineer updated");
      setIsEditEngineerModalOpen(false);
      setEditingEngineer(null);
      fetchCycle();
      fetchEngineers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update engineer");
    }
  }

  function handleOpenDeleteEngineer(engineer: EngineerWithCapacity) {
    setEngineerToDelete(engineer);
    setIsDeleteEngineerModalOpen(true);
  }

  async function handleDeleteEngineer() {
    if (!engineerToDelete) return;

    try {
      const res = await fetch(`/api/engineers/${engineerToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete engineer");
      }

      toast.success("Engineer deleted");
      setIsDeleteEngineerModalOpen(false);
      setEngineerToDelete(null);
      fetchCycle();
      fetchEngineers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete engineer");
    }
  }

  function handleOpenEditCycle() {
    if (!cycle) return;
    setEditCycleForm({
      name: cycle.name,
      startDate: new Date(cycle.startDate).toISOString().split("T")[0],
      endDate: new Date(cycle.endDate).toISOString().split("T")[0],
      description: cycle.description || "",
    });
    setIsEditCycleModalOpen(true);
  }

  async function handleEditCycle(e: React.FormEvent) {
    e.preventDefault();

    if (!editCycleForm.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const res = await fetch(`/api/cycles/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCycleForm.name.trim(),
          startDate: editCycleForm.startDate,
          endDate: editCycleForm.endDate,
          description: editCycleForm.description.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update cycle");
      }

      toast.success("Cycle updated");
      setIsEditCycleModalOpen(false);
      fetchCycle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update cycle");
    }
  }

  async function handleDeleteCycle(e: React.FormEvent) {
    e.preventDefault();
    
    if (!cycle) return;
    
    if (deleteCycleConfirmation !== cycle.name) {
      toast.error("Cycle name does not match");
      return;
    }

    try {
      const res = await fetch(`/api/cycles/${cycleId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete cycle");
      }

      toast.success("Cycle deleted");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete cycle");
    }
  }

  async function handleCreatePod(e: React.FormEvent) {
    e.preventDefault();

    if (!podForm.name.trim()) {
      toast.error("Pod name is required");
      return;
    }

    try {
      const res = await fetch("/api/pods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: podForm.name.trim(),
          cycleId,
          leaderId: podForm.leaderId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create pod");
      }

      toast.success("Pod created");
      setIsCreatePodModalOpen(false);
      setPodForm({ name: "", leaderId: "" });
      fetchCycle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create pod");
    }
  }

  // Get engineers assigned to pitches in a specific pod
  function getEngineersInPod(podId: string): { id: string; name: string }[] {
    if (!cycle) return [];
    
    const podPitches = cycle.pitches.filter((p) => p.podId === podId);
    const engineerIds = new Set<string>();
    const engineers: { id: string; name: string }[] = [];
    
    podPitches.forEach((pitch) => {
      pitch.assignments.forEach((assignment) => {
        if (!engineerIds.has(assignment.engineerId)) {
          engineerIds.add(assignment.engineerId);
          engineers.push({
            id: assignment.engineerId,
            name: assignment.engineerName,
          });
        }
      });
    });
    
    return engineers;
  }

  function handleOpenEditPod(pod: Pod) {
    setEditingPod(pod);
    // Check if current leader is still valid (assigned to a pitch in this pod)
    const validEngineers = getEngineersInPod(pod.id);
    const leaderStillValid = pod.leaderId && validEngineers.some(e => e.id === pod.leaderId);
    
    setPodForm({
      name: pod.name,
      leaderId: leaderStillValid ? pod.leaderId! : "",
    });
    setIsEditPodModalOpen(true);
  }

  async function handleEditPod(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPod) return;

    if (!podForm.name.trim()) {
      toast.error("Pod name is required");
      return;
    }

    try {
      const res = await fetch(`/api/pods/${editingPod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: podForm.name.trim(),
          leaderId: podForm.leaderId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update pod");
      }

      toast.success("Pod updated");
      setIsEditPodModalOpen(false);
      setEditingPod(null);
      setPodForm({ name: "", leaderId: "" });
      fetchCycle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update pod");
    }
  }

  function handleOpenDeletePod(pod: Pod) {
    setPodToDelete(pod);
    setIsDeletePodModalOpen(true);
  }

  async function handleDeletePod() {
    if (!podToDelete) return;

    try {
      const res = await fetch(`/api/pods/${podToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete pod");
      }

      toast.success("Pod deleted");
      setIsDeletePodModalOpen(false);
      setPodToDelete(null);
      fetchCycle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete pod");
    }
  }

  // Engineers not yet in this cycle
  const availableEngineers = allEngineers.filter(
    (eng) => !cycle?.engineers.find((e) => e.id === eng.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-gray-300 rounded-full" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Cycle not found</p>
      </div>
    );
  }

  // Betting Pitch Row Component
  function BettingPitchRow({ pitch }: { pitch: BettingPitch }) {
    return (
      <div
        className={clsx(
          "flex items-center justify-between px-4 py-3",
          pitch.isRejected && "opacity-50"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={clsx(
              "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
              pitch.isApproved
                ? "bg-emerald-500/20 text-emerald-400"
                : pitch.isRejected
                  ? "bg-gray-700 text-gray-500"
                  : "bg-gray-700 text-gray-400"
            )}
          >
            {pitch.isApproved ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : pitch.isRejected ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <span className="w-2 h-2 rounded-full bg-gray-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {pitch.pitchDocUrl ? (
              <a
                href={pitch.pitchDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-100 hover:text-white truncate"
              >
                {pitch.title}
              </a>
            ) : (
              <span className="font-medium text-gray-100 truncate">{pitch.title}</span>
            )}
          </div>

          <InlineWeeksEditor
            pitchId={pitch.id}
            estimateWeeks={Number(pitch.estimateWeeks)}
            onUpdate={fetchCycle}
          />
        </div>

        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={() => handleBettingAction(pitch.id, pitch.isApproved ? "unapprove" : "approve")}
            className={clsx(
              "p-2 rounded-lg transition-colors",
              pitch.isApproved
                ? "text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30"
                : "text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10"
            )}
            title={pitch.isApproved ? "Remove from cycle" : "Approve - Add to cycle"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
          </button>
          <button
            onClick={() => handleBettingAction(pitch.id, pitch.isRejected ? "unreject" : "reject")}
            className={clsx(
              "p-2 rounded-lg transition-colors",
              pitch.isRejected
                ? "text-red-400 bg-red-500/20 hover:bg-red-500/30"
                : "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            )}
            title={pitch.isRejected ? "Unreject - Move back to pending" : "Reject"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
            </svg>
          </button>
          {!pitch.isApproved && (
            <button
              onClick={() => handleBettingAction(pitch.id, "remove")}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
              title="Remove from betting table"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center text-sm text-gray-400 hover:text-gray-200 mb-2"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Cycles
            </button>
            <h1 className="text-3xl font-bold text-gray-100">{cycle.name}</h1>
            <p className="mt-1 text-gray-400">
              {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
            </p>
            {cycle.description && (
              <p className="mt-2 text-gray-400">{cycle.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenEditCycle}
              className="btn-secondary flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Edit
            </button>
            <button
              onClick={() => {
                const shareUrl = `${window.location.origin}/cycles/${cycleId}/share`;
                navigator.clipboard.writeText(shareUrl);
                toast.success("Share link copied to clipboard!");
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share
            </button>
            {isAdmin && (
              <button
                onClick={() => setIsDeleteCycleModalOpen(true)}
                className="btn-danger flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab("main")}
              className={clsx(
                "py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "main"
                  ? "border-violet-500 text-gray-100"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              )}
            >
              Cycle View
            </button>
            <button
              onClick={() => setActiveTab("betting")}
              className={clsx(
                "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                activeTab === "betting"
                  ? "border-violet-500 text-gray-100"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              )}
            >
              Betting Table
              {(cycle.bettingPitches || []).filter((p) => !p.isApproved && !p.isRejected).length > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                  {(cycle.bettingPitches || []).filter((p) => !p.isApproved && !p.isRejected).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("signups")}
              className={clsx(
                "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                activeTab === "signups"
                  ? "border-violet-500 text-gray-100"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              )}
            >
              Signups
              {signups.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                  {signups.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {activeTab === "main" ? (
          <div className="flex w-full h-[calc(100vh-270px)] rounded-xl border border-gray-700/50">
            {/* Engineers Sidebar */}
            <div className="w-72 shrink-0 bg-gray-900/50 border-r border-gray-700/50 flex flex-col">
              {/* Summary Stats */}
              <div className="p-4 border-b border-gray-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Available</span>
                  <span className="font-semibold text-gray-100">{cycle.totalAvailableWeeks.toFixed(1)}w</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Required</span>
                  <span className="font-semibold text-gray-100">{cycle.totalRequiredWeeks.toFixed(1)}w</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Balance</span>
                  <span className={clsx(
                    "font-semibold",
                    cycle.surplusOrDeficit >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {cycle.surplusOrDeficit >= 0 ? "+" : ""}{cycle.surplusOrDeficit.toFixed(1)}w
                  </span>
                </div>
              </div>

              {/* Engineers Header */}
              <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-100">Engineers</h3>
                <button
                  onClick={() => setIsAddEngineerModalOpen(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
                  title="Add engineer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Engineers List */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
                {cycle.engineers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No engineers yet</p>
                    <button
                      onClick={() => setIsAddEngineerModalOpen(true)}
                      className="btn-primary text-sm mt-3"
                    >
                      Add Engineer
                    </button>
                  </div>
                ) : (
                  <>
                    {cycle.engineers
                      .filter((engineer) => engineer.remainingWeeks > 0)
                      .map((engineer) => (
                        <DraggableEngineerCard
                          key={engineer.id}
                          engineer={engineer}
                          isDragging={activeEngineer?.id === engineer.id}
                          onEdit={handleOpenEditEngineer}
                          onDelete={handleOpenDeleteEngineer}
                        />
                      ))}
                    {cycle.engineers.filter((e) => e.remainingWeeks > 0).length === 0 &&
                      cycle.engineers.length > 0 && (
                        <div className="text-center py-6 text-gray-500 text-sm">
                          All engineers fully allocated
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>

            {/* Pods - scrolls horizontally */}
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-thin">
              <div className="flex gap-4 p-4">
                {/* Unassigned Column - only show if there are unassigned pitches */}
                {cycle.pitches.filter((p) => !p.podId).length > 0 && (
                  <KanbanColumn
                    id="unassigned"
                    title="Unassigned"
                    pitches={cycle.pitches.filter((p) => !p.podId)}
                    cycleId={cycleId}
                    onAssignmentDelete={handleAssignmentDelete}
                    onAssignmentUpdate={handleAssignmentUpdate}
                    onEditPitch={handleOpenEditPitch}
                    onPitchStatusChange={handlePitchStatusChange}
                    onWeeksUpdate={fetchCycle}
                    onPitchUpdate={handlePitchUpdate}
                    dropTargetPitchId={dropTargetPitchId}
                    activePitchId={activePitch?.id || null}
                    onAddPitch={() => setIsAddPitchModalOpen(true)}
                    isOver={dropTargetColumnId === "column-unassigned"}
                  />
                )}

                {/* Pod Columns - Sortable */}
                <SortableContext
                  items={cycle.pods.map((p) => `sortable-pod-${p.id}`)}
                  strategy={horizontalListSortingStrategy}
                >
                  {cycle.pods.map((pod) => (
                    <SortableKanbanColumn key={pod.id} pod={pod}>
                      {(dragHandleProps) => (
                        <KanbanColumn
                          id={pod.id}
                          title={pod.name}
                          subtitle={pod.leaderName ? `Lead: ${pod.leaderName}` : undefined}
                          pitches={cycle.pitches.filter((p) => p.podId === pod.id)}
                          cycleId={cycleId}
                          onAssignmentDelete={handleAssignmentDelete}
                          onAssignmentUpdate={handleAssignmentUpdate}
                          onEditPitch={handleOpenEditPitch}
                          onPitchStatusChange={handlePitchStatusChange}
                          onWeeksUpdate={fetchCycle}
                          onPitchUpdate={handlePitchUpdate}
                          dropTargetPitchId={dropTargetPitchId}
                          activePitchId={activePitch?.id || null}
                          onAddPitch={() => setIsAddPitchModalOpen(true)}
                          onEditPod={() => handleOpenEditPod(pod)}
                          onDeletePod={() => handleOpenDeletePod(pod)}
                          isAdmin={isAdmin}
                          isOver={dropTargetColumnId === `column-${pod.id}`}
                          dragHandleProps={dragHandleProps}
                        />
                      )}
                    </SortableKanbanColumn>
                  ))}
                </SortableContext>

                {/* Add Pod Button */}
                <div className="w-80 min-w-80">
                  <button
                    onClick={() => setIsCreatePodModalOpen(true)}
                    className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-700 hover:border-gray-600 rounded-xl text-gray-500 hover:text-gray-400 transition-colors"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm font-medium">Add Pod</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeEngineer && <EngineerDragOverlay engineer={activeEngineer} />}
              {activePitch && <PitchDragOverlay pitch={activePitch} />}
            </DragOverlay>
          </div>
        ) : activeTab === "betting" ? (
          /* Betting Table View */
          <div className="space-y-6">
            {/* Summary Bar - same as main view */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5">
                <div className="text-sm font-medium text-gray-400 mb-1">
                  Available Weeks
                </div>
                <div className="text-3xl font-bold text-gray-100">
                  {cycle.totalAvailableWeeks.toFixed(1)}
                  <span className="text-lg font-normal text-gray-500 ml-1">weeks</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {cycle.engineers.length} engineer
                  {cycle.engineers.length !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="card p-5">
                <div className="text-sm font-medium text-gray-400 mb-1">
                  Required Weeks
                </div>
                <div className="text-3xl font-bold text-gray-100">
                  {cycle.totalRequiredWeeks.toFixed(1)}
                  <span className="text-lg font-normal text-gray-500 ml-1">weeks</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {cycle.pitches.length} pitch
                  {cycle.pitches.length !== 1 ? "es" : ""}
                </div>
              </div>

              <div
                className={clsx(
                  "card p-5",
                  cycle.surplusOrDeficit < 0 && "bg-red-500/10 border-red-500/30"
                )}
              >
                <div className="text-sm font-medium text-gray-400 mb-1">Balance</div>
                <div
                  className={clsx(
                    "text-3xl font-bold",
                    cycle.surplusOrDeficit >= 0 ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {cycle.surplusOrDeficit >= 0 ? "+" : ""}
                  {cycle.surplusOrDeficit.toFixed(1)}
                  <span className="text-lg font-normal ml-1">weeks</span>
                </div>
                {cycle.surplusOrDeficit < 0 ? (
                  <div className="mt-2 text-sm text-red-400 font-medium">
                    ⚠️ Over capacity by{" "}
                    {Math.abs(cycle.surplusOrDeficit).toFixed(1)} weeks
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-emerald-400">
                    ✓ Capacity available
                  </div>
                )}
              </div>
            </div>

            {/* Betting Table */}
            <div className="card">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-100">Betting Table</h2>
                <button onClick={() => setIsAddToBettingModalOpen(true)} className="btn-primary text-sm">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Pitch
                </button>
              </div>

              {(cycle.bettingPitches || []).length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">No pitches in the betting table</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Add pitches to evaluate them before committing to the cycle
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {/* Approved pitches */}
                  {(cycle.bettingPitches || [])
                    .filter((p) => p.isApproved)
                    .map((pitch) => (
                      <BettingPitchRow key={pitch.id} pitch={pitch} />
                    ))}

                  {/* Pending pitches */}
                  {(cycle.bettingPitches || [])
                    .filter((p) => !p.isApproved && !p.isRejected)
                    .map((pitch) => (
                      <BettingPitchRow key={pitch.id} pitch={pitch} />
                    ))}

                  {/* Rejected pitches */}
                  {(cycle.bettingPitches || []).filter((p) => p.isRejected).length > 0 && (
                    <>
                      <div className="px-4 py-2 bg-gray-800/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rejected
                      </div>
                      {(cycle.bettingPitches || [])
                        .filter((p) => p.isRejected)
                        .map((pitch) => (
                          <BettingPitchRow key={pitch.id} pitch={pitch} />
                        ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Signups View */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Pitch Signups</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {signups.length} submission{signups.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchSignups}
                  className="btn-secondary text-sm flex items-center gap-1.5"
                  disabled={signupsLoading}
                >
                  <svg className={clsx("w-4 h-4", signupsLoading && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/cycles/${cycleId}/signup`;
                    navigator.clipboard.writeText(url);
                    toast.success("Signup link copied to clipboard");
                  }}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Signup Link
                </button>
              </div>
            </div>

            <div className="card">
              {signupsLoading ? (
                <div className="p-8 flex items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-gray-300 rounded-full" />
                </div>
              ) : signups.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gray-800 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No signups yet</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Share the signup link to start collecting preferences
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                          <span className="inline-flex items-center gap-1">🥇 1st Choice</span>
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                          <span className="inline-flex items-center gap-1">🥈 2nd Choice</span>
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                          <span className="inline-flex items-center gap-1">🥉 3rd Choice</span>
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {signups.map((signup) => (
                        <tr key={signup.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-gray-200">{signup.personName}</td>
                          <td className="py-3 px-4 text-sm text-gray-300">{signup.firstChoice.pitchTitle}</td>
                          <td className="py-3 px-4 text-sm text-gray-300">{signup.secondChoice.pitchTitle}</td>
                          <td className="py-3 px-4 text-sm text-gray-300">{signup.thirdChoice.pitchTitle}</td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {new Date(signup.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DndContext>

      {/* Add Engineer Modal */}
      <Modal
        isOpen={isAddEngineerModalOpen}
        onClose={() => {
          setIsAddEngineerModalOpen(false);
          setIsCreatingNewEngineer(false);
          setNewEngineerForm({ name: "", email: "" });
        }}
        title={isCreatingNewEngineer ? "Create New Engineer" : "Add Engineer to Cycle"}
      >
        {isCreatingNewEngineer ? (
          <form onSubmit={handleCreateNewEngineer} className="space-y-5">
            <div>
              <label htmlFor="newEngineerName" className="label">
                Name
              </label>
              <input
                id="newEngineerName"
                type="text"
                required
                className="input"
                placeholder="e.g., Jane Smith"
                value={newEngineerForm.name}
                onChange={(e) =>
                  setNewEngineerForm({
                    ...newEngineerForm,
                    name: e.target.value,
                  })
                }
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="newEngineerEmail" className="label">
                Email (optional)
              </label>
              <input
                id="newEngineerEmail"
                type="email"
                className="input"
                placeholder="e.g., jane@company.com"
                value={newEngineerForm.email}
                onChange={(e) =>
                  setNewEngineerForm({
                    ...newEngineerForm,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label htmlFor="newEngineerWeeks" className="label">
                Available Weeks
              </label>
              <input
                id="newEngineerWeeks"
                type="number"
                step="0.5"
                min="0.5"
                className="input"
                placeholder="e.g., 6"
                value={defaultAvailableWeeks}
                onChange={(e) => setDefaultAvailableWeeks(e.target.value)}
              />
              <p className="mt-1 text-sm text-gray-500">
                How many weeks can this engineer work during this cycle?
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNewEngineer(false);
                  setNewEngineerForm({ name: "", email: "" });
                }}
                className="btn-ghost text-sm"
              >
                ← Back to existing engineers
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddEngineerModalOpen(false);
                    setIsCreatingNewEngineer(false);
                    setNewEngineerForm({ name: "", email: "" });
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create & Add
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAddEngineerToCycle} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Select Engineers</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Default weeks:</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    className="input w-20 py-1 px-2 text-sm"
                    value={defaultAvailableWeeks}
                    onChange={(e) => setDefaultAvailableWeeks(e.target.value)}
                  />
                </div>
              </div>
              
              {availableEngineers.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center bg-gray-800/50 rounded-lg">
                  All engineers are already in this cycle.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-700 rounded-lg p-3 bg-gray-800/30">
                  {availableEngineers.map((eng) => {
                    const isSelected = eng.id in selectedEngineersMap;
                    return (
                      <div
                        key={eng.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary-900/40 border border-primary-700/50"
                            : "bg-gray-700/30 hover:bg-gray-700/50 border border-transparent"
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            const newMap = { ...selectedEngineersMap };
                            delete newMap[eng.id];
                            setSelectedEngineersMap(newMap);
                          } else {
                            setSelectedEngineersMap({
                              ...selectedEngineersMap,
                              [eng.id]: defaultAvailableWeeks,
                            });
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-primary-500 border-primary-500"
                                : "border-gray-500 hover:border-gray-400"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-200">
                              {eng.name}
                            </div>
                            {eng.email && (
                              <div className="text-xs text-gray-500">
                                {eng.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className={`flex items-center gap-2 ${isSelected ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-xs text-gray-400">weeks:</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            className="input w-16 py-1 px-2 text-sm"
                            value={selectedEngineersMap[eng.id] || defaultAvailableWeeks}
                            onChange={(e) =>
                              setSelectedEngineersMap({
                                ...selectedEngineersMap,
                                [eng.id]: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <p className={`mt-2 text-sm ${Object.keys(selectedEngineersMap).length > 0 ? "text-primary-400" : "text-gray-500"}`}>
                {Object.keys(selectedEngineersMap).length} engineer
                {Object.keys(selectedEngineersMap).length !== 1 ? "s" : ""} selected
              </p>
            </div>

            <div className="border-t border-gray-700 pt-4 mt-4">
              <button
                type="button"
                onClick={() => setIsCreatingNewEngineer(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-primary-400 hover:text-primary-300 hover:bg-primary-900/30 rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Create New Engineer
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddEngineerModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={availableEngineers.length === 0 || Object.keys(selectedEngineersMap).length === 0}
                className="btn-primary"
              >
                Add {Object.keys(selectedEngineersMap).length > 0
                  ? `${Object.keys(selectedEngineersMap).length} Engineer${
                      Object.keys(selectedEngineersMap).length > 1 ? "s" : ""
                    }`
                  : "to Cycle"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Pitch Modal */}
      <Modal
        isOpen={isAddPitchModalOpen}
        onClose={() => {
          setIsAddPitchModalOpen(false);
          setIsCreatingNewPitch(false);
          setSelectedPitchId("");
        }}
        title={isCreatingNewPitch ? "Create New Pitch" : "Add Pitch to Cycle"}
      >
        {!isCreatingNewPitch ? (
          <div className="space-y-5">
            {availablePitches.length > 0 ? (
              <>
                <div>
                  <label htmlFor="selectPitch" className="label">
                    Select from Available Pitches
                  </label>
                  <select
                    id="selectPitch"
                    className="input"
                    value={selectedPitchId}
                    onChange={(e) => setSelectedPitchId(e.target.value)}
                  >
                    <option value="">Choose a pitch...</option>
                    {availablePitches.map((pitch) => (
                      <option key={pitch.id} value={pitch.id}>
                        {pitch.priority ? `#${pitch.priority} ` : ""}{pitch.title}
                        {pitch.estimateWeeks > 0 ? ` (${pitch.estimateWeeks}w)` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-gray-700" />
                  <span className="text-sm text-gray-500">or</span>
                  <div className="flex-1 border-t border-gray-700" />
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center py-2">
                No available pitches in backlog
              </p>
            )}

            <button
              type="button"
              onClick={() => setIsCreatingNewPitch(true)}
              className="w-full py-3 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Pitch
            </button>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddPitchModalOpen(false);
                  setSelectedPitchId("");
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignExistingPitch}
                disabled={!selectedPitchId}
                className="btn-primary"
              >
                Add to Cycle
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAddPitch} className="space-y-5">
            <div>
              <label htmlFor="title" className="label">
                Title
              </label>
              <input
                id="title"
                type="text"
                required
                className="input"
                placeholder="e.g., User Authentication Overhaul"
                value={addPitchForm.title}
                onChange={(e) =>
                  setAddPitchForm({ ...addPitchForm, title: e.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="pitchDocUrl" className="label">
                Pitch Doc URL (optional)
              </label>
              <input
                id="pitchDocUrl"
                type="url"
                className="input"
                placeholder="https://docs.example.com/pitch/..."
                value={addPitchForm.pitchDocUrl}
                onChange={(e) =>
                  setAddPitchForm({ ...addPitchForm, pitchDocUrl: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="estimateWeeks" className="label">
                  Estimate (weeks)
                </label>
                <input
                  id="estimateWeeks"
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  className="input"
                  placeholder="e.g., 4"
                  value={addPitchForm.estimateWeeks}
                  onChange={(e) =>
                    setAddPitchForm({
                      ...addPitchForm,
                      estimateWeeks: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label htmlFor="priority" className="label">
                  Priority (optional)
                </label>
                <input
                  id="priority"
                  type="number"
                  min="1"
                  className="input"
                  placeholder="e.g., 1"
                  value={addPitchForm.priority}
                  onChange={(e) =>
                    setAddPitchForm({ ...addPitchForm, priority: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="label">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                className="input resize-none"
                placeholder="Any additional context..."
                value={addPitchForm.notes}
                onChange={(e) =>
                  setAddPitchForm({ ...addPitchForm, notes: e.target.value })
                }
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setIsCreatingNewPitch(false)}
                className="text-sm text-gray-400 hover:text-gray-300"
              >
                ← Back to selection
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPitchModalOpen(false);
                    setIsCreatingNewPitch(false);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create & Add
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Assignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setPendingAssignment(null);
        }}
        title="Assign Engineer"
      >
        {pendingAssignment && (
          <div className="space-y-5">
            <div className="text-gray-300">
              How many weeks should{" "}
              <span className="font-semibold">
                {pendingAssignment.engineer.name}
              </span>{" "}
              contribute to{" "}
              <span className="font-semibold">
                {pendingAssignment.pitch.title}
              </span>
              ?
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-500">Engineer available</div>
                <div className="font-semibold text-gray-100">
                  {pendingAssignment.engineer.remainingWeeks.toFixed(1)} weeks
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-500">Pitch needs</div>
                <div className="font-semibold text-gray-100">
                  {pendingAssignment.pitch.remainingWeeks.toFixed(1)} weeks
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="weeks" className="label">
                Weeks to allocate
              </label>
              <input
                id="weeks"
                type="number"
                step="0.5"
                min="0.5"
                className="input"
                value={assignmentWeeks}
                onChange={(e) => setAssignmentWeeks(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setPendingAssignment(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignmentCreate}
                className="btn-primary"
              >
                Assign
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Pitch Modal */}
      <Modal
        isOpen={isEditPitchModalOpen}
        onClose={() => {
          setIsEditPitchModalOpen(false);
          setEditingPitch(null);
        }}
        title="Edit Pitch"
      >
        <form onSubmit={handleEditPitch} className="space-y-5">
          <div>
            <label htmlFor="editTitle" className="label">
              Title
            </label>
            <input
              id="editTitle"
              type="text"
              required
              className="input"
              value={editPitchForm.title}
              onChange={(e) =>
                setEditPitchForm({ ...editPitchForm, title: e.target.value })
              }
            />
          </div>

          <div>
            <label htmlFor="editPitchDocUrl" className="label">
              Pitch Doc URL (optional)
            </label>
            <input
              id="editPitchDocUrl"
              type="url"
              className="input"
              placeholder="https://docs.example.com/pitch/..."
              value={editPitchForm.pitchDocUrl}
              onChange={(e) =>
                setEditPitchForm({ ...editPitchForm, pitchDocUrl: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="editEstimateWeeks" className="label">
                Estimate (weeks)
              </label>
              <input
                id="editEstimateWeeks"
                type="number"
                step="0.5"
                min="0.5"
                required
                className="input"
                value={editPitchForm.estimateWeeks}
                onChange={(e) =>
                  setEditPitchForm({
                    ...editPitchForm,
                    estimateWeeks: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label htmlFor="editPriority" className="label">
                Priority (optional)
              </label>
              <input
                id="editPriority"
                type="number"
                min="1"
                className="input"
                value={editPitchForm.priority}
                onChange={(e) =>
                  setEditPitchForm({ ...editPitchForm, priority: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="editStatus" className="label">
                Status
              </label>
              <select
                id="editStatus"
                className="input"
                value={editPitchForm.status}
                onChange={(e) =>
                  setEditPitchForm({
                    ...editPitchForm,
                    status: e.target.value as PitchStatus,
                  })
                }
              >
                <option value="BACKLOG">Backlog</option>
                <option value="PLANNING">Planning</option>
                <option value="READY_FOR_DEV">Ready for Dev</option>
                <option value="COMPLETE">Complete</option>
                <option value="CANCELED">Canceled</option>
              </select>
            </div>
            <div>
              <label htmlFor="editPod" className="label">
                Pod (optional)
              </label>
              <select
                id="editPod"
                className="input"
                value={editPitchForm.podId}
                onChange={(e) =>
                  setEditPitchForm({
                    ...editPitchForm,
                    podId: e.target.value,
                  })
                }
              >
                <option value="">No pod</option>
                {cycle?.pods.map((pod) => (
                  <option key={pod.id} value={pod.id}>
                    {pod.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="editProductManager" className="label">
                Product Manager (optional)
              </label>
              <select
                id="editProductManager"
                className="input"
                value={editPitchForm.productManagerId}
                onChange={(e) =>
                  setEditPitchForm({
                    ...editPitchForm,
                    productManagerId: e.target.value,
                  })
                }
              >
                <option value="">No Product Manager</option>
                {allProductManagers.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="editProductDesigner" className="label">
                Product Designer (optional)
              </label>
              <select
                id="editProductDesigner"
                className="input"
                value={editPitchForm.productDesignerId}
                onChange={(e) =>
                  setEditPitchForm({
                    ...editPitchForm,
                    productDesignerId: e.target.value,
                  })
                }
              >
                <option value="">No Product Designer</option>
                {allProductDesigners.map((pd) => (
                  <option key={pd.id} value={pd.id}>
                    {pd.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="editNotes" className="label">
              Notes (optional)
            </label>
            <textarea
              id="editNotes"
              rows={3}
              className="input resize-none"
              value={editPitchForm.notes}
              onChange={(e) =>
                setEditPitchForm({ ...editPitchForm, notes: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditPitchModalOpen(false);
                setEditingPitch(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Engineer Modal */}
      <Modal
        isOpen={isEditEngineerModalOpen}
        onClose={() => {
          setIsEditEngineerModalOpen(false);
          setEditingEngineer(null);
        }}
        title="Edit Engineer"
      >
        <form onSubmit={handleEditEngineer} className="space-y-5">
          <div>
            <label htmlFor="editEngineerName" className="label">
              Name
            </label>
            <input
              id="editEngineerName"
              type="text"
              required
              className="input"
              value={editEngineerForm.name}
              onChange={(e) =>
                setEditEngineerForm({ ...editEngineerForm, name: e.target.value })
              }
            />
          </div>

          <div>
            <label htmlFor="editEngineerEmail" className="label">
              Email (optional)
            </label>
            <input
              id="editEngineerEmail"
              type="email"
              className="input"
              placeholder="engineer@company.com"
              value={editEngineerForm.email}
              onChange={(e) =>
                setEditEngineerForm({ ...editEngineerForm, email: e.target.value })
              }
            />
          </div>

          <div>
            <label htmlFor="editEngineerWeeks" className="label">
              Available Weeks (this cycle)
            </label>
            <input
              id="editEngineerWeeks"
              type="number"
              step="0.5"
              min="0.5"
              required
              className="input"
              value={editEngineerForm.availableWeeks}
              onChange={(e) =>
                setEditEngineerForm({
                  ...editEngineerForm,
                  availableWeeks: e.target.value,
                })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditEngineerModalOpen(false);
                setEditingEngineer(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Engineer Confirmation Modal */}
      <Modal
        isOpen={isDeleteEngineerModalOpen}
        onClose={() => {
          setIsDeleteEngineerModalOpen(false);
          setEngineerToDelete(null);
        }}
        title="Delete Engineer"
      >
        <div className="space-y-5">
          <p className="text-gray-400">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-100">
              {engineerToDelete?.name}
            </span>
            ? This will remove them from all cycles and delete all their assignments.
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsDeleteEngineerModalOpen(false);
                setEngineerToDelete(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteEngineer}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Delete Engineer
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Pod Confirmation Modal */}
      <Modal
        isOpen={isDeletePodModalOpen}
        onClose={() => {
          setIsDeletePodModalOpen(false);
          setPodToDelete(null);
        }}
        title="Delete Pod"
      >
        <div className="space-y-5">
          <p className="text-gray-400">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-100">
              {podToDelete?.name}
            </span>
            ? Pitches in this pod will be moved to unassigned.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsDeletePodModalOpen(false);
                setPodToDelete(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeletePod}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Delete Pod
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Cycle Modal */}
      <Modal
        isOpen={isEditCycleModalOpen}
        onClose={() => setIsEditCycleModalOpen(false)}
        title="Edit Cycle"
      >
        <form onSubmit={handleEditCycle} className="space-y-5">
          <div>
            <label htmlFor="editCycleName" className="label">
              Cycle Name
            </label>
            <input
              id="editCycleName"
              type="text"
              required
              className="input"
              value={editCycleForm.name}
              onChange={(e) =>
                setEditCycleForm({ ...editCycleForm, name: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="editCycleStartDate" className="label">
                Start Date
              </label>
              <input
                id="editCycleStartDate"
                type="date"
                required
                className="input"
                value={editCycleForm.startDate}
                onChange={(e) =>
                  setEditCycleForm({ ...editCycleForm, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="editCycleEndDate" className="label">
                End Date
              </label>
              <input
                id="editCycleEndDate"
                type="date"
                required
                className="input"
                value={editCycleForm.endDate}
                onChange={(e) =>
                  setEditCycleForm({ ...editCycleForm, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label htmlFor="editCycleDescription" className="label">
              Description (optional)
            </label>
            <textarea
              id="editCycleDescription"
              rows={3}
              className="input resize-none"
              value={editCycleForm.description}
              onChange={(e) =>
                setEditCycleForm({ ...editCycleForm, description: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditCycleModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Cycle Modal */}
      <Modal
        isOpen={isDeleteCycleModalOpen}
        onClose={() => {
          setIsDeleteCycleModalOpen(false);
          setDeleteCycleConfirmation("");
        }}
        title="Delete Cycle"
      >
        <form onSubmit={handleDeleteCycle} className="space-y-5">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">
              <strong>Warning:</strong> This action cannot be undone. All pitches, assignments, and pod data associated with this cycle will be permanently deleted.
            </p>
          </div>

          <div>
            <label htmlFor="deleteCycleConfirmation" className="label">
              Type <span className="font-mono text-red-400">{cycle?.name}</span> to confirm
            </label>
            <input
              id="deleteCycleConfirmation"
              type="text"
              required
              className="input"
              placeholder="Enter cycle name to confirm"
              value={deleteCycleConfirmation}
              onChange={(e) => setDeleteCycleConfirmation(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsDeleteCycleModalOpen(false);
                setDeleteCycleConfirmation("");
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-danger"
              disabled={deleteCycleConfirmation !== cycle?.name}
            >
              Delete Cycle
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Pod Modal */}
      <Modal
        isOpen={isCreatePodModalOpen}
        onClose={() => {
          setIsCreatePodModalOpen(false);
          setPodForm({ name: "", leaderId: "" });
        }}
        title="Create Pod"
      >
        <form onSubmit={handleCreatePod} className="space-y-5">
          <div>
            <label htmlFor="podName" className="label">
              Pod Name
            </label>
            <input
              id="podName"
              type="text"
              required
              className="input"
              placeholder="e.g., Platform Team"
              value={podForm.name}
              onChange={(e) =>
                setPodForm({ ...podForm, name: e.target.value })
              }
            />
          </div>

          <p className="text-sm text-gray-400">
            You can assign a pod leader after adding pitches and assigning engineers to them.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreatePodModalOpen(false);
                setPodForm({ name: "", leaderId: "" });
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Pod
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Pod Modal */}
      <Modal
        isOpen={isEditPodModalOpen}
        onClose={() => {
          setIsEditPodModalOpen(false);
          setEditingPod(null);
          setPodForm({ name: "", leaderId: "" });
        }}
        title="Edit Pod"
      >
        <form onSubmit={handleEditPod} className="space-y-5">
          <div>
            <label htmlFor="editPodName" className="label">
              Pod Name
            </label>
            <input
              id="editPodName"
              type="text"
              required
              className="input"
              value={podForm.name}
              onChange={(e) =>
                setPodForm({ ...podForm, name: e.target.value })
              }
            />
          </div>

          <div>
            <label htmlFor="editPodLeader" className="label">
              Pod Leader (optional)
            </label>
            {editingPod && getEngineersInPod(editingPod.id).length > 0 ? (
              <select
                id="editPodLeader"
                className="input"
                value={podForm.leaderId}
                onChange={(e) =>
                  setPodForm({ ...podForm, leaderId: e.target.value })
                }
              >
                <option value="">No leader</option>
                {getEngineersInPod(editingPod.id).map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-400 py-2">
                No engineers assigned to pitches in this pod yet. Add pitches and assign engineers first.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditPodModalOpen(false);
                setEditingPod(null);
                setPodForm({ name: "", leaderId: "" });
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Add to Betting Table Modal */}
      <Modal
        isOpen={isAddToBettingModalOpen}
        onClose={() => {
          setIsAddToBettingModalOpen(false);
          setSelectedBettingPitches(new Set());
        }}
        title="Add Pitches to Betting Table"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Select pitches to add to the betting table for evaluation.
          </p>
          
          {(() => {
            const filteredPitches = availablePitches.filter(
              (p) => !(cycle?.bettingPitches || []).some((bp) => bp.id === p.id)
            );
            
            return filteredPitches.length > 0 ? (
              <>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredPitches.map((pitch) => {
                    const isSelected = selectedBettingPitches.has(pitch.id);
                    return (
                      <button
                        key={pitch.id}
                        onClick={() => {
                          setSelectedBettingPitches((prev) => {
                            const next = new Set(prev);
                            if (next.has(pitch.id)) {
                              next.delete(pitch.id);
                            } else {
                              next.add(pitch.id);
                            }
                            return next;
                          });
                        }}
                        className={clsx(
                          "w-full text-left p-3 rounded-lg border transition-colors",
                          isSelected
                            ? "border-violet-500 bg-violet-500/10"
                            : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={clsx(
                              "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                              isSelected
                                ? "border-violet-500 bg-violet-500"
                                : "border-gray-600"
                            )}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 flex items-center justify-between min-w-0">
                            <span className="font-medium text-gray-100 truncate">{pitch.title}</span>
                            <span className="text-sm text-gray-400 flex-shrink-0 ml-2">
                              {Number(pitch.estimateWeeks).toFixed(1)}w
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                  <span className="text-sm text-gray-400">
                    {selectedBettingPitches.size} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsAddToBettingModalOpen(false);
                        setSelectedBettingPitches(new Set());
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddToBetting(Array.from(selectedBettingPitches))}
                      disabled={selectedBettingPitches.size === 0}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add {selectedBettingPitches.size > 0 ? `(${selectedBettingPitches.size})` : ""}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-500 text-center py-4">
                  No available pitches to add. Create new pitches on the Pitches page first.
                </p>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsAddToBettingModalOpen(false)}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </Modal>
    </>
  );
}

