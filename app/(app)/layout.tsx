"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { UserButton } from "@clerk/nextjs";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";

const navigation = [
  {
    name: "Cycles",
    href: "/",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
  },
  {
    name: "Pitches",
    href: "/pitches",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    name: "Engineers",
    href: "/engineers",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
    ),
  },
  {
    name: "Product Managers",
    href: "/product-managers",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    name: "Product Designers",
    href: "/product-designers",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>
    ),
  },
];

function NavItem({ item, isActive }: { item: typeof navigation[0]; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={clsx(
        "group relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
        isActive
          ? "bg-violet-600 text-white"
          : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
      )}
    >
      {item.icon}
      {/* Tooltip */}
      <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm font-medium text-gray-100 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-lg">
        {item.name}
        {/* Arrow */}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
      </div>
    </Link>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  // Listen for sidebar event to open create modal
  useEffect(() => {
    const handleOpenCreate = () => setIsCreateModalOpen(true);
    window.addEventListener("openCreateCycle", handleOpenCreate);
    return () => window.removeEventListener("openCreateCycle", handleOpenCreate);
  }, []);

  async function handleCreateCycle(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create cycle");
      }

      const newCycle = await res.json();
      toast.success("Cycle created successfully");
      setIsCreateModalOpen(false);
      setFormData({ name: "", startDate: "", endDate: "", description: "" });
      
      // Navigate to the new cycle
      router.push(`/cycles/${newCycle.id}`);
      
      // Also dispatch event so cycles page can refresh if it's mounted
      window.dispatchEvent(new CustomEvent("cycleCreated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create cycle");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-16 bg-gray-900 border-r border-gray-800 flex flex-col z-30">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-800">
          <Link href="/" className="group relative flex items-center justify-center w-10 h-10 rounded-lg bg-white">
            <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {/* Tooltip */}
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm font-medium text-gray-100 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-lg">
              Cycle Planning
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center py-4 gap-2">
          {navigation.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={
                item.href === "/"
                  ? pathname === "/" || pathname.startsWith("/cycles")
                  : pathname.startsWith(item.href)
              }
            />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-gray-800 py-4 flex flex-col items-center gap-2">
          {/* Add Cycle */}
          <button
            onClick={() => {
              // Dispatch custom event to open create cycle modal
              window.dispatchEvent(new CustomEvent("openCreateCycle"));
            }}
            className="group relative flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm font-medium text-gray-100 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-lg">
              New Cycle
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
            </div>
          </button>

          {/* User Profile */}
          <div className="mt-2">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9",
                },
              }}
            />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>

      {/* Create Cycle Modal - Available globally */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Cycle"
      >
        <form onSubmit={handleCreateCycle} className="space-y-5">
          <div>
            <label htmlFor="name" className="label">
              Cycle Name
            </label>
            <input
              id="name"
              type="text"
              required
              className="input"
              placeholder="e.g., Q1 2024 - Cycle 1"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="label">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                required
                className="input"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="endDate" className="label">
                End Date
              </label>
              <input
                id="endDate"
                type="date"
                required
                className="input"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="label">
              Description (optional)
            </label>
            <textarea
              id="description"
              rows={3}
              className="input resize-none"
              placeholder="What's the focus of this cycle?"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
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
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Cycle"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
