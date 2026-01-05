"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";

interface ProductDesigner {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  createdAt: string;
  _count: {
    pitches: number;
  };
}

export default function ProductDesignersPage() {
  const [productDesigners, setProductDesigners] = useState<ProductDesigner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingPD, setEditingPD] = useState<ProductDesigner | null>(null);
  const [deletingPD, setDeletingPD] = useState<ProductDesigner | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "" });

  useEffect(() => {
    fetchProductDesigners();
  }, []);

  async function fetchProductDesigners() {
    try {
      const res = await fetch("/api/product-designers");
      if (!res.ok) throw new Error("Failed to fetch product designers");
      const data = await res.json();
      setProductDesigners(data);
    } catch {
      toast.error("Failed to load product designers");
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
      const res = await fetch("/api/product-designers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create product designer");
      }

      toast.success("Product designer created");
      setIsCreateModalOpen(false);
      setFormData({ name: "", email: "" });
      fetchProductDesigners();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create product designer");
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPD || !formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const res = await fetch(`/api/product-designers/${editingPD.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update product designer");
      }

      toast.success("Product designer updated");
      setIsEditModalOpen(false);
      setEditingPD(null);
      setFormData({ name: "", email: "" });
      fetchProductDesigners();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update product designer");
    }
  }

  async function handleDelete() {
    if (!deletingPD) return;

    try {
      const res = await fetch(`/api/product-designers/${deletingPD.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete product designer");
      }

      toast.success("Product designer deleted");
      setIsDeleteModalOpen(false);
      setDeletingPD(null);
      fetchProductDesigners();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete product designer");
    }
  }

  function openEditModal(pd: ProductDesigner) {
    setEditingPD(pd);
    setFormData({ name: pd.name, email: pd.email || "" });
    setIsEditModalOpen(true);
  }

  function openDeleteModal(pd: ProductDesigner) {
    setDeletingPD(pd);
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
          <h1 className="text-2xl font-semibold text-gray-100">Product Designers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage product designers for pitch design support
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
          Add Product Designer
        </button>
      </div>

      {/* Product Designers List */}
      {productDesigners.length === 0 ? (
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
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-100">No product designers yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add your first product designer to assign them to pitches
          </p>
          <button
            onClick={() => {
              setFormData({ name: "", email: "" });
              setIsCreateModalOpen(true);
            }}
            className="btn-primary mt-4"
          >
            Add Product Designer
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
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pitches
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
              {productDesigners.map((pd) => (
                <tr key={pd.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-pink-600/20 flex items-center justify-center text-pink-400 text-sm font-medium">
                        {pd.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <span className="font-medium text-gray-100">{pd.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {pd.email || "—"}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm text-gray-400">{pd._count.pitches}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      pd.active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-gray-700 text-gray-400"
                    }`}>
                      {pd.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(pd)}
                        className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openDeleteModal(pd)}
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
        title="Add Product Designer"
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
              placeholder="e.g., Alex Johnson"
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
              placeholder="alex@example.com"
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
              Add Product Designer
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPD(null);
        }}
        title="Edit Product Designer"
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
                setEditingPD(null);
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
          setDeletingPD(null);
        }}
        title="Delete Product Designer"
      >
        <div className="space-y-5">
          <p className="text-gray-300">
            Are you sure you want to delete <span className="font-semibold text-gray-100">{deletingPD?.name}</span>?
          </p>
          <p className="text-sm text-gray-500">
            They will be removed from all associated pitches. This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingPD(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleDelete} className="btn-danger">
              Delete Product Designer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

