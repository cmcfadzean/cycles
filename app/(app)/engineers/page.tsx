"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import toast from "react-hot-toast";

interface Engineer {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  createdAt: string;
}

export default function EngineersPage() {
  const { isAdmin } = useIsAdmin();
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [editingEngineer, setEditingEngineer] = useState<Engineer | null>(null);
  const [deactivatingEngineer, setDeactivatingEngineer] = useState<Engineer | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "" });

  useEffect(() => {
    fetchEngineers();
  }, []);

  async function fetchEngineers() {
    try {
      const res = await fetch("/api/engineers?includeInactive=true");
      if (!res.ok) throw new Error("Failed to fetch engineers");
      const data = await res.json();
      setEngineers(data);
    } catch {
      toast.error("Failed to load engineers");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const res = await fetch("/api/engineers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create engineer");
      }

      toast.success("Engineer created");
      setIsCreateModalOpen(false);
      setFormData({ name: "", email: "" });
      fetchEngineers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create engineer");
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEngineer || !formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const res = await fetch(`/api/engineers/${editingEngineer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update engineer");
      }

      toast.success("Engineer updated");
      setIsEditModalOpen(false);
      setEditingEngineer(null);
      setFormData({ name: "", email: "" });
      fetchEngineers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update engineer");
    }
  }

  async function setActive(engineer: Engineer, active: boolean) {
    const res = await fetch(`/api/engineers/${engineer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update engineer");
    }
  }

  async function handleDeactivate() {
    if (!deactivatingEngineer) return;

    try {
      await setActive(deactivatingEngineer, false);
      toast.success("Engineer deactivated");
      setIsDeactivateModalOpen(false);
      setDeactivatingEngineer(null);
      fetchEngineers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate engineer");
    }
  }

  async function handleReactivate(engineer: Engineer) {
    try {
      await setActive(engineer, true);
      toast.success("Engineer reactivated");
      fetchEngineers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reactivate engineer");
    }
  }

  function openEditModal(engineer: Engineer) {
    setEditingEngineer(engineer);
    setFormData({ name: engineer.name, email: engineer.email || "" });
    setIsEditModalOpen(true);
  }

  function openDeactivateModal(engineer: Engineer) {
    setDeactivatingEngineer(engineer);
    setIsDeactivateModalOpen(true);
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
          <h1 className="text-2xl font-semibold text-gray-100">Engineers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your team members
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", email: "" });
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
          Add Engineer
        </button>
      </div>

      {/* Engineers List */}
      {engineers.length === 0 ? (
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-100">No engineers yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add your first engineer to get started
          </p>
          <button
            onClick={() => {
              setFormData({ name: "", email: "" });
              setIsCreateModalOpen(true);
            }}
            className="btn-primary mt-4"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Engineer
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {engineers.map((engineer) => (
                <tr key={engineer.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-gray-700 flex items-center justify-center text-gray-300 text-sm font-medium">
                        {engineer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <span className="font-medium text-gray-100">{engineer.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {engineer.email || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      engineer.active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-gray-700 text-gray-400"
                    }`}>
                      {engineer.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(engineer)}
                        className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {isAdmin &&
                        (engineer.active ? (
                          <button
                            onClick={() => openDeactivateModal(engineer)}
                            className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                            title="Deactivate"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(engineer)}
                            className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                            title="Reactivate"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        ))}
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
        title="Add Engineer"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label htmlFor="name" className="label">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              className="input"
              placeholder="e.g., John Smith"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="email" className="label">
              Email (optional)
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
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
              Add Engineer
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEngineer(null);
        }}
        title="Edit Engineer"
      >
        <form onSubmit={handleEdit} className="space-y-5">
          <div>
            <label htmlFor="editName" className="label">
              Name
            </label>
            <input
              id="editName"
              type="text"
              required
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="editEmail" className="label">
              Email (optional)
            </label>
            <input
              id="editEmail"
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
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

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={() => {
          setIsDeactivateModalOpen(false);
          setDeactivatingEngineer(null);
        }}
        title="Deactivate Engineer"
      >
        <div className="space-y-5">
          <p className="text-gray-300">
            Deactivate <span className="font-semibold text-gray-100">{deactivatingEngineer?.name}</span>?
          </p>
          <p className="text-sm text-gray-500">
            They won&apos;t appear when adding engineers to new cycles, but their
            history and existing assignments are kept. You can reactivate them
            anytime.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsDeactivateModalOpen(false);
                setDeactivatingEngineer(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleDeactivate} className="btn-danger">
              Deactivate
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

