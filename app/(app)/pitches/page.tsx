"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { PitchStatus } from "@/lib/types";
import toast from "react-hot-toast";
import clsx from "clsx";

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

type Tab = "available" | "funded";

export default function PitchesPage() {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [productManagers, setProductManagers] = useState<ProductManager[]>([]);
  const [productDesigners, setProductDesigners] = useState<ProductDesigner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("available");
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
    status: "PLANNED" as PitchStatus,
    productManagerId: "",
    productDesignerId: "",
  });

  useEffect(() => {
    fetchPitches();
    fetchProductManagers();
    fetchProductDesigners();
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

  const availablePitches = pitches.filter((p) => p.cycleId === null);
  const fundedPitches = pitches.filter((p) => p.cycleId !== null);
  const displayedPitches = activeTab === "available" ? availablePitches : fundedPitches;

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
      status: "PLANNED",
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
      <div className="flex gap-1 p-1 bg-gray-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("available")}
          className={clsx(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "available"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-gray-200"
          )}
        >
          Available
          <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-gray-600 text-gray-300">
            {availablePitches.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("funded")}
          className={clsx(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "funded"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-gray-200"
          )}
        >
          Funded
          <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-gray-600 text-gray-300">
            {fundedPitches.length}
          </span>
        </button>
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
            {activeTab === "available" ? "No available pitches" : "No funded pitches"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === "available"
              ? "Create a pitch to add to your backlog"
              : "Assign pitches to cycles to see them here"}
          </p>
          {activeTab === "available" && (
            <button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="btn-primary mt-4"
            >
              New Pitch
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
                {activeTab === "funded" && (
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cycle
                  </th>
                )}
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
                    <StatusBadge status={pitch.status} />
                  </td>
                  <td className="px-5 py-4">
                    {pitch.productManager ? (
                      <span className="text-sm text-gray-300">{pitch.productManager.name}</span>
                    ) : (
                      <span className="text-sm text-gray-600">—</span>
                    )}
                  </td>
                  {activeTab === "funded" && (
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-300">{pitch.cycle?.name}</span>
                    </td>
                  )}
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
                      {activeTab === "funded" && (
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
        onClose={() => setIsCreateModalOpen(false)}
        title="New Pitch"
      >
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
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
              <option value="DROPPED">Dropped</option>
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

