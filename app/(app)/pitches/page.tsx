"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { PitchStatus } from "@/lib/types";
import toast from "react-hot-toast";
import clsx from "clsx";
import Link from "next/link";

interface Pitch {
  id: string;
  title: string;
  pitchDocUrl: string | null;
  estimateWeeks: number;
  status: PitchStatus;
  priority: number | null;
  notes: string | null;
  cycleId: string | null;
  productManagerId: string | null;
  productDesignerId: string | null;
  cycle: {
    id: string;
    name: string;
  } | null;
  productManager: {
    id: string;
    name: string;
  } | null;
  productDesigner: {
    id: string;
    name: string;
  } | null;
  assignments: Array<{
    id: string;
    weeksAllocated: number;
    engineer: {
      id: string;
      name: string;
    };
  }>;
  createdAt: string;
}

interface ProductManager {
  id: string;
  name: string;
}

interface ProductDesigner {
  id: string;
  name: string;
}

interface LinearProject {
  id: string;
  name: string;
  description: string | null;
  url: string;
}

interface LinearInitiative {
  id: string;
  name: string;
  description: string | null;
  hasChildren: boolean;
  hasProjects: boolean;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

type Tab = PitchStatus | "all";
type CreateMode = "manual" | "linear";

const tabConfig: Record<Tab, { label: string; color: string }> = {
  all: { label: "All", color: "gray" },
  BACKLOG: { label: "Backlog", color: "gray" },
  PLANNING: { label: "Planning", color: "blue" },
  READY_FOR_DEV: { label: "Ready for Dev", color: "violet" },
  COMPLETE: { label: "Complete", color: "emerald" },
  CANCELED: { label: "Canceled", color: "gray" },
};

export default function PitchesPage() {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [productManagers, setProductManagers] = useState<ProductManager[]>([]);
  const [productDesigners, setProductDesigners] = useState<ProductDesigner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingPitch, setEditingPitch] = useState<Pitch | null>(null);
  const [deletingPitch, setDeletingPitch] = useState<Pitch | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    pitchDocUrl: "",
    estimateWeeks: "",
    priority: "",
    notes: "",
    status: "BACKLOG" as PitchStatus,
    productManagerId: "",
    productDesignerId: "",
  });

  // Linear integration state
  const [createMode, setCreateMode] = useState<CreateMode>("manual");
  const [linearConnected, setLinearConnected] = useState(false);
  const [linearInitiatives, setLinearInitiatives] = useState<LinearInitiative[]>([]);
  const [linearProjects, setLinearProjects] = useState<LinearProject[]>([]);
  const [loadingLinear, setLoadingLinear] = useState(false);
  const [linearSearchQuery, setLinearSearchQuery] = useState("");
  const [selectedLinearProjects, setSelectedLinearProjects] = useState<Set<string>>(new Set());
  const [importingLinear, setImportingLinear] = useState(false);
  const [linearBreadcrumb, setLinearBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [showingProjects, setShowingProjects] = useState(false);

  useEffect(() => {
    fetchPitches();
    fetchProductManagers();
    fetchProductDesigners();
    checkLinearConnection();
  }, []);

  async function fetchPitches() {
    try {
      const res = await fetch("/api/pitches");
      if (!res.ok) throw new Error("Failed to fetch pitches");
      const data = await res.json();
      setPitches(data);
    } catch {
      toast.error("Failed to load pitches");
    } finally {
      setLoading(false);
    }
  }

  async function fetchProductManagers() {
    try {
      const res = await fetch("/api/product-managers");
      if (!res.ok) throw new Error("Failed to fetch product managers");
      const data = await res.json();
      setProductManagers(data);
    } catch {
      console.error("Failed to load product managers");
    }
  }

  async function fetchProductDesigners() {
    try {
      const res = await fetch("/api/product-designers");
      if (!res.ok) throw new Error("Failed to fetch product designers");
      const data = await res.json();
      setProductDesigners(data);
    } catch {
      console.error("Failed to load product designers");
    }
  }

  async function checkLinearConnection() {
    try {
      const res = await fetch("/api/settings/linear");
      if (!res.ok) return;
      const data = await res.json();
      setLinearConnected(data.connected);
    } catch {
      // Silently fail - Linear integration is optional
    }
  }

  async function fetchLinearProjects() {
    if (!linearConnected) return;
    
    setLoadingLinear(true);
    setShowingProjects(true);
    
    try {
      const res = await fetch("/api/linear/projects");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch Linear projects");
      }
      const data = await res.json();
      setLinearProjects(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch Linear projects");
    } finally {
      setLoadingLinear(false);
    }
  }

  async function fetchLinearInitiatives(parentId?: string) {
    if (!linearConnected) return;
    
    setLoadingLinear(true);
    setShowingProjects(false);
    setLinearProjects([]);
    
    try {
      const url = parentId 
        ? `/api/linear/initiatives?parentId=${parentId}`
        : "/api/linear/initiatives";
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch initiatives");
      }
      const data = await res.json();
      setLinearInitiatives(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch initiatives");
    } finally {
      setLoadingLinear(false);
    }
  }

  async function fetchInitiativeProjects(initiativeId: string) {
    if (!linearConnected) return;
    
    setLoadingLinear(true);
    setShowingProjects(true);
    setLinearInitiatives([]);
    
    try {
      const res = await fetch(`/api/linear/initiatives/${initiativeId}/projects`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch projects");
      }
      const data = await res.json();
      setLinearProjects(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setLoadingLinear(false);
    }
  }

  function handleInitiativeClick(initiative: LinearInitiative) {
    // Add to breadcrumb
    setLinearBreadcrumb((prev) => [...prev, { id: initiative.id, name: initiative.name }]);
    
    if (initiative.hasChildren) {
      // Navigate to child initiatives
      fetchLinearInitiatives(initiative.id);
    } else if (initiative.hasProjects) {
      // Show projects for this initiative
      fetchInitiativeProjects(initiative.id);
    }
  }

  function handleBreadcrumbClick(index: number) {
    if (index === -1) {
      // Back to root
      setLinearBreadcrumb([]);
      setShowingProjects(false);
      fetchLinearInitiatives();
    } else {
      // Navigate to specific breadcrumb
      const newBreadcrumb = linearBreadcrumb.slice(0, index + 1);
      setLinearBreadcrumb(newBreadcrumb);
      
      const targetId = newBreadcrumb[newBreadcrumb.length - 1].id;
      // We need to determine if this is an initiative with children or projects
      // For simplicity, re-fetch children
      fetchLinearInitiatives(targetId);
    }
  }

  function resetLinearNavigation() {
    setLinearBreadcrumb([]);
    setLinearInitiatives([]);
    setLinearProjects([]);
    setShowingProjects(false);
    setSelectedLinearProjects(new Set());
    setLinearSearchQuery("");
  }

  async function handleImportFromLinear() {
    if (selectedLinearProjects.size === 0) {
      toast.error("Please select at least one project to import");
      return;
    }

    setImportingLinear(true);
    try {
      const projectsToImport = linearProjects.filter((p) => selectedLinearProjects.has(p.id));
      
      // Create pitches for each selected project
      const results = await Promise.all(
        projectsToImport.map((project) =>
          fetch("/api/pitches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: project.name,
              pitchDocUrl: project.url,
              notes: project.description || "",
              estimateWeeks: 0, // Default, user can edit later
            }),
          })
        )
      );

      const failedCount = results.filter((r) => !r.ok).length;
      if (failedCount > 0) {
        toast.error(`Failed to import ${failedCount} project(s)`);
      } else {
        toast.success(
          selectedLinearProjects.size === 1
            ? "Project imported successfully"
            : `${selectedLinearProjects.size} projects imported successfully`
        );
      }

      setIsCreateModalOpen(false);
      resetLinearNavigation();
      setCreateMode("manual");
      fetchPitches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import projects");
    } finally {
      setImportingLinear(false);
    }
  }

  // Count pitches by status
  const statusCounts: Record<Tab, number> = {
    all: pitches.length,
    BACKLOG: pitches.filter((p) => p.status === "BACKLOG").length,
    PLANNING: pitches.filter((p) => p.status === "PLANNING").length,
    READY_FOR_DEV: pitches.filter((p) => p.status === "READY_FOR_DEV").length,
    COMPLETE: pitches.filter((p) => p.status === "COMPLETE").length,
    CANCELED: pitches.filter((p) => p.status === "CANCELED").length,
  };
  
  const displayedPitches = activeTab === "all" 
    ? pitches 
    : pitches.filter((p) => p.status === activeTab);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      const res = await fetch("/api/pitches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          pitchDocUrl: formData.pitchDocUrl.trim() || null,
          estimateWeeks: formData.estimateWeeks ? parseFloat(formData.estimateWeeks) : 0,
          priority: formData.priority ? parseInt(formData.priority) : null,
          notes: formData.notes.trim() || null,
          productManagerId: formData.productManagerId || null,
          productDesignerId: formData.productDesignerId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create pitch");
      }

      toast.success("Pitch created");
      setIsCreateModalOpen(false);
      resetForm();
      fetchPitches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create pitch");
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPitch || !formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      const res = await fetch(`/api/pitches/${editingPitch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          pitchDocUrl: formData.pitchDocUrl.trim() || null,
          estimateWeeks: formData.estimateWeeks ? parseFloat(formData.estimateWeeks) : 0,
          priority: formData.priority ? parseInt(formData.priority) : null,
          notes: formData.notes.trim() || null,
          status: formData.status,
          productManagerId: formData.productManagerId || null,
          productDesignerId: formData.productDesignerId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update pitch");
      }

      toast.success("Pitch updated");
      setIsEditModalOpen(false);
      setEditingPitch(null);
      resetForm();
      fetchPitches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update pitch");
    }
  }

  async function handleStatusChange(pitchId: string, newStatus: PitchStatus) {
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
      fetchPitches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleDelete() {
    if (!deletingPitch) return;

    try {
      const res = await fetch(`/api/pitches/${deletingPitch.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete pitch");
      }

      toast.success("Pitch deleted");
      setIsDeleteModalOpen(false);
      setDeletingPitch(null);
      fetchPitches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete pitch");
    }
  }

  async function handleRemoveFromCycle(pitch: Pitch) {
    if (!confirm(`Remove "${pitch.title}" from ${pitch.cycle?.name}? This will clear all assignments.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/pitches/${pitch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId: null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove from cycle");
      }

      toast.success("Pitch removed from cycle");
      fetchPitches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove from cycle");
    }
  }

  function resetForm() {
    setFormData({
      title: "",
      pitchDocUrl: "",
      estimateWeeks: "",
      priority: "",
      notes: "",
      status: "BACKLOG",
      productManagerId: "",
      productDesignerId: "",
    });
  }

  function openEditModal(pitch: Pitch) {
    setEditingPitch(pitch);
    setFormData({
      title: pitch.title,
      pitchDocUrl: pitch.pitchDocUrl || "",
      estimateWeeks: pitch.estimateWeeks.toString(),
      priority: pitch.priority?.toString() || "",
      notes: pitch.notes || "",
      status: pitch.status,
      productManagerId: pitch.productManagerId || "",
      productDesignerId: pitch.productDesignerId || "",
    });
    setIsEditModalOpen(true);
  }

  function openDeleteModal(pitch: Pitch) {
    setDeletingPitch(pitch);
    setIsDeleteModalOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-gray-300 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Pitches</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and organize your project pitches
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="btn-primary"
        >
          <svg
            className="w-4 h-4 mr-2"
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
          New Pitch
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <nav className="flex gap-4 overflow-x-auto">
          {(Object.keys(tabConfig) as Tab[]).map((tab) => {
            const config = tabConfig[tab];
            const count = statusCounts[tab];
            const isActive = activeTab === tab;
            
            // Color classes based on tab
            const activeColorClasses = {
              gray: "bg-gray-500/20 text-gray-300",
              blue: "bg-blue-500/20 text-blue-400",
              violet: "bg-violet-500/20 text-violet-400",
              emerald: "bg-emerald-500/20 text-emerald-400",
            }[config.color];
            
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
                  isActive
                    ? "border-violet-500 text-gray-100"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                )}
              >
                {config.label}
                <span className={clsx(
                  "px-1.5 py-0.5 text-xs rounded-full",
                  isActive ? activeColorClasses : "bg-gray-700 text-gray-400"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Pitches List */}
      {displayedPitches.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gray-800 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-100">
            No {activeTab === "all" ? "" : tabConfig[activeTab].label.toLowerCase()} pitches
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === "all" || activeTab === "BACKLOG"
              ? "Create a pitch to add to your backlog"
              : `No pitches with "${tabConfig[activeTab].label}" status`}
          </p>
          {(activeTab === "all" || activeTab === "BACKLOG") && (
            <button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="btn-primary mt-4"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Pitch
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pitch
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estimate
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PM
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cycle
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {displayedPitches.map((pitch) => (
                <tr key={pitch.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {pitch.priority && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-700 text-xs font-medium text-gray-400">
                            {pitch.priority}
                          </span>
                        )}
                        <span className="font-medium text-gray-100">{pitch.title}</span>
                        {pitch.pitchDocUrl && (
                          <a
                            href={pitch.pitchDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                      {pitch.notes && (
                        <p className="text-sm text-gray-500 mt-1 truncate max-w-md">
                          {pitch.notes}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {pitch.estimateWeeks > 0 ? `${pitch.estimateWeeks}w` : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge 
                      status={pitch.status} 
                      onChange={(newStatus) => handleStatusChange(pitch.id, newStatus)}
                    />
                  </td>
                  <td className="px-5 py-4">
                    {pitch.productManager ? (
                      <span className="text-sm text-gray-300">{pitch.productManager.name}</span>
                    ) : (
                      <span className="text-sm text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {pitch.cycle ? (
                      <span className="text-sm text-gray-300">{pitch.cycle.name}</span>
                    ) : (
                      <span className="text-sm text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(pitch)}
                        className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {pitch.cycle && (
                        <button
                          onClick={() => handleRemoveFromCycle(pitch)}
                          className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                          title="Remove from cycle"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => openDeleteModal(pitch)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateMode("manual");
          setSelectedLinearProjects(new Set());
          setLinearSearchQuery("");
        }}
        title="New Pitch"
      >
        {/* Mode Toggle */}
        {linearConnected && (
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setCreateMode("manual")}
              className={clsx(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                createMode === "manual"
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              )}
            >
              Create Manually
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateMode("linear");
                resetLinearNavigation();
                fetchLinearProjects();
              }}
              className={clsx(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                createMode === "linear"
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              )}
            >
              <svg className="w-4 h-4" viewBox="0 0 100 100" fill="currentColor">
                <path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3542-.0443L12.6587 18.074Z" />
              </svg>
              Import from Linear
            </button>
          </div>
        )}

        {createMode === "manual" ? (
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label htmlFor="title" className="label">
                Title
              </label>
              <input
                id="title"
                type="text"
                required
                className="input"
                placeholder="e.g., User Dashboard Redesign"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                placeholder="https://..."
                value={formData.pitchDocUrl}
                onChange={(e) => setFormData({ ...formData, pitchDocUrl: e.target.value })}
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
                  min="0"
                  className="input"
                  placeholder="e.g., 2"
                  value={formData.estimateWeeks}
                  onChange={(e) => setFormData({ ...formData, estimateWeeks: e.target.value })}
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
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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
                placeholder="Additional context..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="productManagerId" className="label">
                  Product Manager (optional)
                </label>
                <select
                  id="productManagerId"
                  className="input"
                  value={formData.productManagerId}
                  onChange={(e) => setFormData({ ...formData, productManagerId: e.target.value })}
                >
                  <option value="">No Product Manager</option>
                  {productManagers.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="productDesignerId" className="label">
                  Product Designer (optional)
                </label>
                <select
                  id="productDesignerId"
                  className="input"
                  value={formData.productDesignerId}
                  onChange={(e) => setFormData({ ...formData, productDesignerId: e.target.value })}
                >
                  <option value="">No Product Designer</option>
                  {productDesigners.map((pd) => (
                    <option key={pd.id} value={pd.id}>
                      {pd.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Pitch
              </button>
            </div>
          </form>
        ) : (
          /* Linear Import Mode - Simple project list */
          <div className="space-y-4">
            {/* Loading State */}
            {loadingLinear ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-gray-300 rounded-full" />
              </div>
            ) : linearProjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No active projects found in Linear</p>
                <button
                  onClick={() => fetchLinearProjects()}
                  className="mt-4 text-violet-400 hover:text-violet-300 text-sm"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search projects..."
                    className="input pl-10"
                    value={linearSearchQuery}
                    onChange={(e) => setLinearSearchQuery(e.target.value)}
                  />
                </div>

                {/* Project List */}
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {linearProjects
                    .filter((p) =>
                      p.name.toLowerCase().includes(linearSearchQuery.toLowerCase())
                    )
                    .map((project) => {
                      const isSelected = selectedLinearProjects.has(project.id);
                      return (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => {
                            setSelectedLinearProjects((prev) => {
                              const next = new Set(prev);
                              if (next.has(project.id)) {
                                next.delete(project.id);
                              } else {
                                next.add(project.id);
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
                          <div className="flex items-start gap-3">
                            <div
                              className={clsx(
                                "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                                isSelected
                                  ? "border-violet-500 bg-violet-500"
                                  : "border-gray-600"
                              )}
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
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-100">
                                {project.name}
                              </div>
                              {project.description && (
                                <p className="text-sm text-gray-400 line-clamp-2 mt-0.5">
                                  {project.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>

                {/* Footer with import button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                  <span className="text-sm text-gray-400">
                    {selectedLinearProjects.size} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateModalOpen(false);
                        resetLinearNavigation();
                        setCreateMode("manual");
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleImportFromLinear}
                      disabled={selectedLinearProjects.size === 0 || importingLinear}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importingLinear
                        ? "Importing..."
                        : `Import${selectedLinearProjects.size > 0 ? ` (${selectedLinearProjects.size})` : ""}`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Show Linear connection prompt if not connected */}
        {!linearConnected && createMode === "manual" && (
          <div className="mt-6 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#5E6AD2] flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 100 100" fill="white">
                  <path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3542-.0443L12.6587 18.074Z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-300">
                  Connect Linear to import projects as pitches
                </p>
                <Link
                  href="/settings"
                  className="text-sm text-violet-400 hover:text-violet-300"
                >
                  Go to Settings →
                </Link>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPitch(null);
        }}
        title="Edit Pitch"
      >
        <form onSubmit={handleEdit} className="space-y-5">
          <div>
            <label htmlFor="editTitle" className="label">
              Title
            </label>
            <input
              id="editTitle"
              type="text"
              required
              className="input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
              value={formData.pitchDocUrl}
              onChange={(e) => setFormData({ ...formData, pitchDocUrl: e.target.value })}
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
                min="0"
                className="input"
                value={formData.estimateWeeks}
                onChange={(e) => setFormData({ ...formData, estimateWeeks: e.target.value })}
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
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="editStatus" className="label">
              Status
            </label>
            <select
              id="editStatus"
              className="input"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as PitchStatus })}
            >
              <option value="BACKLOG">Backlog</option>
              <option value="PLANNING">Planning</option>
              <option value="READY_FOR_DEV">Ready for Dev</option>
              <option value="COMPLETE">Complete</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>

          <div>
            <label htmlFor="editNotes" className="label">
              Notes (optional)
            </label>
            <textarea
              id="editNotes"
              rows={3}
              className="input resize-none"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="editProductManagerId" className="label">
                Product Manager (optional)
              </label>
              <select
                id="editProductManagerId"
                className="input"
                value={formData.productManagerId}
                onChange={(e) => setFormData({ ...formData, productManagerId: e.target.value })}
              >
                <option value="">No Product Manager</option>
                {productManagers.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="editProductDesignerId" className="label">
                Product Designer (optional)
              </label>
              <select
                id="editProductDesignerId"
                className="input"
                value={formData.productDesignerId}
                onChange={(e) => setFormData({ ...formData, productDesignerId: e.target.value })}
              >
                <option value="">No Product Designer</option>
                {productDesigners.map((pd) => (
                  <option key={pd.id} value={pd.id}>
                    {pd.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingPitch(null);
        }}
        title="Delete Pitch"
      >
        <div className="space-y-5">
          <p className="text-gray-300">
            Are you sure you want to delete <span className="font-semibold text-gray-100">{deletingPitch?.title}</span>?
          </p>
          <p className="text-sm text-gray-500">
            This will remove the pitch and all its assignments. This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingPitch(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleDelete} className="btn-danger">
              Delete Pitch
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

