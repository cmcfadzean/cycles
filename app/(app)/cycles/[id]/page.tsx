"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import {
  CycleDetail,
  EngineerWithCapacity,
  PitchWithAssignments,
  PitchStatus,
  Pod,
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
        "card p-4 transition-all duration-200 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        engineer.remainingWeeks <= 0 && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-semibold">
            {engineer.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <div className="font-semibold text-slate-100">{engineer.name}</div>
            {engineer.email && (
              <div className="text-xs text-slate-400">{engineer.email}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(engineer);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            title="Edit engineer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(engineer);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Remove from cycle"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Capacity</span>
          <span className="font-medium text-slate-200">
            {engineer.availableWeeks.toFixed(1)}w
          </span>
        </div>

        <div className="progress-bar">
          <div
            className={clsx("progress-bar-fill", getCapacityColor())}
            style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Remaining</span>
          <span
            className={clsx(
              "font-semibold",
              engineer.remainingWeeks < 0
                ? "text-red-600"
                : engineer.remainingWeeks <= engineer.availableWeeks * 0.2
                  ? "text-amber-600"
                  : "text-emerald-600"
            )}
          >
            {engineer.remainingWeeks.toFixed(1)}w
          </span>
        </div>
      </div>

      {engineer.remainingWeeks <= 0 && (
        <div className="mt-3 text-xs text-center text-red-300 font-medium bg-red-900/30 border border-red-800/50 rounded-lg py-1.5">
          Fully allocated
        </div>
      )}
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
  isOver,
}: {
  pitch: PitchWithAssignments;
  cycleId: string;
  onAssignmentDelete: (id: string) => void;
  onAssignmentUpdate: (id: string, weeks: number) => void;
  onEdit: (pitch: PitchWithAssignments) => void;
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
        isOver && "ring-2 ring-primary-400 ring-offset-2 ring-offset-slate-900 bg-primary-900/30"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {pitch.priority && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-xs font-semibold text-slate-300">
                {pitch.priority}
              </span>
            )}
            {pitch.pitchDocUrl ? (
              <a
                href={pitch.pitchDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-100 hover:text-primary-400 transition-colors truncate"
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
              <span className="font-semibold text-slate-100 truncate">
                {pitch.title}
              </span>
            )}
          </div>
          <StatusBadge status={pitch.status} />
        </div>
        <button
          onClick={() => onEdit(pitch)}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
          title="Edit pitch"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {pitch.notes && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">{pitch.notes}</p>
      )}

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Estimate</span>
          <span className="font-medium text-slate-200">
            {pitch.estimateWeeks.toFixed(1)}w
          </span>
        </div>

        <div className="progress-bar h-2.5">
          <div
            className={clsx("progress-bar-fill", getStatusColor())}
            style={{ width: `${Math.min(filledPercentage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Assigned</span>
          <span className="font-medium text-slate-200">
            {pitch.assignedWeeks.toFixed(1)}w
          </span>
        </div>
      </div>

      {pitch.remainingWeeks !== 0 && (
        <div
          className={clsx(
            "text-xs text-center font-medium rounded-lg py-1.5 mb-4",
            pitch.remainingWeeks > 0
              ? "text-amber-300 bg-amber-900/30 border border-amber-800/50"
              : "text-red-300 bg-red-900/30 border border-red-800/50"
          )}
        >
          {pitch.remainingWeeks > 0
            ? `${pitch.remainingWeeks.toFixed(1)}w unassigned`
            : `Over by ${Math.abs(pitch.remainingWeeks).toFixed(1)}w`}
        </div>
      )}

      {pitch.remainingWeeks === 0 && (
        <div className="text-xs text-center font-medium rounded-lg py-1.5 mb-4 text-emerald-300 bg-emerald-900/30 border border-emerald-800/50">
          Fully staffed
        </div>
      )}

      {/* Assigned Engineers */}
      {pitch.assignments.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Team
          </div>
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
        </div>
      )}

      {pitch.assignments.length === 0 && (
        <div className="text-center py-4 border-2 border-dashed border-slate-600 rounded-lg">
          <svg
            className="w-6 h-6 mx-auto text-slate-500 mb-2"
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
          <p className="text-sm text-slate-500">
            Drag an engineer here to assign
          </p>
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
    <div className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2 group">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-semibold">
          {assignment.engineerName
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <span className="text-sm font-medium text-slate-200">
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
            className="w-16 text-sm font-medium text-slate-100 bg-slate-800 border border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all"
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
    <div className="card p-4 shadow-2xl scale-105 cursor-grabbing w-64 bg-slate-800/95 backdrop-blur-sm border border-slate-600">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-semibold">
          {engineer.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <div className="font-semibold text-slate-100">{engineer.name}</div>
          <div className="text-xs text-slate-400">
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
  const cycleId = params.id as string;

  const [cycle, setCycle] = useState<CycleDetail | null>(null);
  const [allEngineers, setAllEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeEngineer, setActiveEngineer] =
    useState<EngineerWithCapacity | null>(null);
  const [dropTargetPitchId, setDropTargetPitchId] = useState<string | null>(
    null
  );

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
  const [editingPod, setEditingPod] = useState<Pod | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{
    engineer: EngineerWithCapacity;
    pitch: PitchWithAssignments;
  } | null>(null);
  const [assignmentWeeks, setAssignmentWeeks] = useState("");
  const [editingPitch, setEditingPitch] = useState<PitchWithAssignments | null>(null);
  const [editingEngineer, setEditingEngineer] = useState<EngineerWithCapacity | null>(null);
  const [engineerToDelete, setEngineerToDelete] = useState<EngineerWithCapacity | null>(null);

  // Form states
  const [addEngineerForm, setAddEngineerForm] = useState({
    engineerId: "",
    availableWeeks: "6",
  });
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
  const [editPitchForm, setEditPitchForm] = useState({
    title: "",
    pitchDocUrl: "",
    estimateWeeks: "",
    status: "PLANNED" as PitchStatus,
    priority: "",
    notes: "",
    podId: "",
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

  useEffect(() => {
    fetchCycle();
    fetchEngineers();
  }, [fetchCycle, fetchEngineers]);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const engineer = active.data.current?.engineer as EngineerWithCapacity;
    if (engineer) {
      setActiveEngineer(engineer);
    }
  }

  function handleDragOver(event: DragEndEvent) {
    const { over } = event;
    if (over && over.id.toString().startsWith("pitch-")) {
      const pitchId = over.id.toString().replace("pitch-", "");
      setDropTargetPitchId(pitchId);
    } else {
      setDropTargetPitchId(null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveEngineer(null);
    setDropTargetPitchId(null);

    if (!over || !over.id.toString().startsWith("pitch-")) return;

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

  async function handleAddEngineerToCycle(e: React.FormEvent) {
    e.preventDefault();

    if (!addEngineerForm.engineerId) {
      toast.error("Please select an engineer");
      return;
    }

    const weeks = parseFloat(addEngineerForm.availableWeeks);
    if (isNaN(weeks) || weeks <= 0) {
      toast.error("Please enter valid available weeks");
      return;
    }

    try {
      const res = await fetch(
        `/api/engineers/${addEngineerForm.engineerId}/capacities`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cycleId,
            availableWeeks: weeks,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add engineer");
      }

      toast.success("Engineer added to cycle");
      setIsAddEngineerModalOpen(false);
      setAddEngineerForm({ engineerId: "", availableWeeks: "6" });
      fetchCycle();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add engineer"
      );
    }
  }

  async function handleCreateNewEngineer(e: React.FormEvent) {
    e.preventDefault();

    if (!newEngineerForm.name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    const weeks = parseFloat(addEngineerForm.availableWeeks);
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
      setAddEngineerForm({ engineerId: "", availableWeeks: "6" });
      fetchCycle();
      fetchEngineers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create engineer"
      );
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

      toast.success("Pitch created");
      setIsAddPitchModalOpen(false);
      setAddPitchForm({
        title: "",
        pitchDocUrl: "",
        estimateWeeks: "",
        priority: "",
        notes: "",
      });
      fetchCycle();
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

  async function handleDeletePod(podId: string) {
    if (!confirm("Are you sure you want to delete this pod? Pitches will be ungrouped.")) {
      return;
    }

    try {
      const res = await fetch(`/api/pods/${podId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete pod");
      }

      toast.success("Pod deleted");
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
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Cycle not found</p>
      </div>
    );
  }

  return (
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
              className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200 mb-2"
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
            <h1 className="text-3xl font-bold text-slate-100">{cycle.name}</h1>
            <p className="mt-1 text-slate-400">
              {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
            </p>
            {cycle.description && (
              <p className="mt-2 text-slate-400">{cycle.description}</p>
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
          </div>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-sm font-medium text-slate-400 mb-1">
              Available Weeks
            </div>
            <div className="text-3xl font-bold text-slate-100">
              {cycle.totalAvailableWeeks.toFixed(1)}
              <span className="text-lg font-normal text-slate-500 ml-1">
                weeks
              </span>
            </div>
            <div className="mt-2 text-sm text-slate-500">
              {cycle.engineers.length} engineer
              {cycle.engineers.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="card p-5">
            <div className="text-sm font-medium text-slate-400 mb-1">
              Required Weeks
            </div>
            <div className="text-3xl font-bold text-slate-100">
              {cycle.totalRequiredWeeks.toFixed(1)}
              <span className="text-lg font-normal text-slate-500 ml-1">
                weeks
              </span>
            </div>
            <div className="mt-2 text-sm text-slate-500">
              {cycle.pitches.length} pitch
              {cycle.pitches.length !== 1 ? "es" : ""}
            </div>
          </div>

          <div
            className={clsx(
              "card p-5",
              cycle.surplusOrDeficit < 0 && "bg-red-50 border-red-200"
            )}
          >
            <div className="text-sm font-medium text-slate-400 mb-1">
              Balance
            </div>
            <div
              className={clsx(
                "text-3xl font-bold",
                cycle.surplusOrDeficit >= 0 ? "text-emerald-600" : "text-red-600"
              )}
            >
              {cycle.surplusOrDeficit >= 0 ? "+" : ""}
              {cycle.surplusOrDeficit.toFixed(1)}
              <span className="text-lg font-normal ml-1">weeks</span>
            </div>
            {cycle.surplusOrDeficit < 0 ? (
              <div className="mt-2 text-sm text-red-600 font-medium">
                ⚠️ Over capacity by{" "}
                {Math.abs(cycle.surplusOrDeficit).toFixed(1)} weeks
              </div>
            ) : (
              <div className="mt-2 text-sm text-emerald-600">
                ✓ Capacity available
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Engineers Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Engineers</h2>
              <button
                onClick={() => setIsAddEngineerModalOpen(true)}
                className="btn-ghost text-sm"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add
              </button>
            </div>

            {cycle.engineers.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-slate-500 text-sm">
                  No engineers in this cycle yet
                </p>
                <button
                  onClick={() => setIsAddEngineerModalOpen(true)}
                  className="btn-primary mt-3 text-sm"
                >
                  Add Engineer
                </button>
              </div>
            ) : (
              <div className="space-y-3">
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
                    <div className="text-center py-6 text-slate-500 text-sm">
                      All engineers are fully allocated
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Pitches Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Pitches</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreatePodModalOpen(true)}
                  className="btn-ghost text-sm"
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Add Pod
                </button>
                <button
                  onClick={() => setIsAddPitchModalOpen(true)}
                  className="btn-ghost text-sm"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Pitch
                </button>
              </div>
            </div>

            {cycle.pitches.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-slate-500">No pitches in this cycle yet</p>
                <button
                  onClick={() => setIsAddPitchModalOpen(true)}
                  className="btn-primary mt-3"
                >
                  Add Pitch
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pods with their pitches */}
                {cycle.pods.map((pod) => {
                  const podPitches = cycle.pitches.filter((p) => p.podId === pod.id);
                  if (podPitches.length === 0) return null;
                  
                  return (
                    <div key={pod.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="text-md font-semibold text-slate-200">{pod.name}</h3>
                          {pod.leaderName && (
                            <span className="text-xs bg-primary-900/30 text-primary-300 px-2 py-0.5 rounded-full border border-primary-700/50">
                              Lead: {pod.leaderName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditPod(pod)}
                            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                            title="Edit pod"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeletePod(pod.id)}
                            className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                            title="Delete pod"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-primary-600/30">
                        {podPitches.map((pitch) => (
                          <DroppablePitchCard
                            key={pitch.id}
                            pitch={pitch}
                            cycleId={cycleId}
                            onAssignmentDelete={handleAssignmentDelete}
                            onAssignmentUpdate={handleAssignmentUpdate}
                            onEdit={handleOpenEditPitch}
                            isOver={dropTargetPitchId === pitch.id}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Ungrouped pitches */}
                {cycle.pitches.filter((p) => !p.podId).length > 0 && (
                  <div className="space-y-3">
                    {cycle.pods.length > 0 && (
                      <h3 className="text-md font-semibold text-slate-400">Ungrouped</h3>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cycle.pitches
                        .filter((p) => !p.podId)
                        .map((pitch) => (
                          <DroppablePitchCard
                            key={pitch.id}
                            pitch={pitch}
                            cycleId={cycleId}
                            onAssignmentDelete={handleAssignmentDelete}
                            onAssignmentUpdate={handleAssignmentUpdate}
                            onEdit={handleOpenEditPitch}
                            isOver={dropTargetPitchId === pitch.id}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        <EngineerDragOverlay engineer={activeEngineer} />
      </DragOverlay>

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
                value={addEngineerForm.availableWeeks}
                onChange={(e) =>
                  setAddEngineerForm({
                    ...addEngineerForm,
                    availableWeeks: e.target.value,
                  })
                }
              />
              <p className="mt-1 text-sm text-slate-500">
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
              <label htmlFor="engineer" className="label">
                Engineer
              </label>
              <select
                id="engineer"
                className="input"
                value={addEngineerForm.engineerId}
                onChange={(e) =>
                  setAddEngineerForm({
                    ...addEngineerForm,
                    engineerId: e.target.value,
                  })
                }
              >
                <option value="">Select an engineer...</option>
                {availableEngineers.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name} {eng.email ? `(${eng.email})` : ""}
                  </option>
                ))}
              </select>
              {availableEngineers.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  All engineers are already in this cycle.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="availableWeeks" className="label">
                Available Weeks
              </label>
              <input
                id="availableWeeks"
                type="number"
                step="0.5"
                min="0.5"
                className="input"
                placeholder="e.g., 6"
                value={addEngineerForm.availableWeeks}
                onChange={(e) =>
                  setAddEngineerForm({
                    ...addEngineerForm,
                    availableWeeks: e.target.value,
                  })
                }
              />
              <p className="mt-1 text-sm text-slate-500">
                How many weeks can this engineer work during this cycle?
              </p>
            </div>

            <div className="border-t border-slate-700 pt-4 mt-4">
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
                disabled={availableEngineers.length === 0 || !addEngineerForm.engineerId}
                className="btn-primary"
              >
                Add to Cycle
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Pitch Modal */}
      <Modal
        isOpen={isAddPitchModalOpen}
        onClose={() => setIsAddPitchModalOpen(false)}
        title="Add New Pitch"
      >
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

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddPitchModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Pitch
            </button>
          </div>
        </form>
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
            <div className="text-slate-300">
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
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-slate-500">Engineer available</div>
                <div className="font-semibold text-slate-100">
                  {pendingAssignment.engineer.remainingWeeks.toFixed(1)} weeks
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-slate-500">Pitch needs</div>
                <div className="font-semibold text-slate-100">
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
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
                <option value="DROPPED">Dropped</option>
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
          <p className="text-slate-400">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-100">
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

          <p className="text-sm text-slate-400">
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
              <p className="text-sm text-slate-400 py-2">
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
    </DndContext>
  );
}

