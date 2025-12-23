"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";

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
    name: "Engineers",
    href: "/engineers",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
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

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-16 bg-gray-900 border-r border-gray-800 flex flex-col z-30">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-800">
          <Link href="/" className="group relative flex items-center justify-center w-10 h-10 rounded-lg bg-violet-600">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
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
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
