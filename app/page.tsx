import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-9 h-9 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h-1a1 1 0 00-1 1v8a1 1 0 001 1h1m0-10v10m0-10h2a1 1 0 011 1v8a1 1 0 01-1 1H6m12-10h1a1 1 0 011 1v8a1 1 0 01-1 1h-1m0-10v10m0-10h-2a1 1 0 00-1 1v8a1 1 0 001 1h2M9 12h6" />
            </svg>
            <span className="text-lg font-semibold tracking-tight">Cycles</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/sign-in" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
              Log in
            </Link>
            <Link href="/sign-up" className="btn-primary text-sm">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-40 pb-32 px-6">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-20 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600 rounded-full blur-[128px]" />
          <div className="absolute top-32 right-1/4 w-72 h-72 bg-blue-600 rounded-full blur-[128px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full border border-gray-800 bg-gray-900/50 text-sm text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            Shape Up methodology, supercharged with AI
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
            The planning system{" "}
            <br className="hidden sm:block" />
            for product{" "}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              engineering
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Plan cycles, bet on pitches, staff teams with AI, and ship with clarity.
            Built for teams that follow Shape Up.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/sign-up" className="btn-primary px-6 py-3 text-base">
              Start planning
            </Link>
            <Link href="/sign-in" className="btn-secondary px-6 py-3 text-base">
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* App Preview */}
      <section className="relative px-6 pb-32">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 shadow-2xl shadow-black/50 overflow-hidden">
            {/* Mock window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900">
              <div className="w-3 h-3 rounded-full bg-gray-700" />
              <div className="w-3 h-3 rounded-full bg-gray-700" />
              <div className="w-3 h-3 rounded-full bg-gray-700" />
              <div className="flex-1 mx-12">
                <div className="h-6 rounded-md bg-gray-800 max-w-sm mx-auto" />
              </div>
            </div>
            {/* Mock UI */}
            <div className="p-6 space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                  <div className="text-xs text-gray-500 mb-1">Available</div>
                  <div className="text-2xl font-bold text-gray-100">48.0<span className="text-sm font-normal text-gray-500 ml-1">weeks</span></div>
                  <div className="text-xs text-gray-600 mt-1">8 engineers</div>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                  <div className="text-xs text-gray-500 mb-1">Required</div>
                  <div className="text-2xl font-bold text-gray-100">42.5<span className="text-sm font-normal text-gray-500 ml-1">weeks</span></div>
                  <div className="text-xs text-gray-600 mt-1">7 pitches</div>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                  <div className="text-xs text-gray-500 mb-1">Balance</div>
                  <div className="text-2xl font-bold text-emerald-400">+5.5<span className="text-sm font-normal ml-1">weeks</span></div>
                  <div className="text-xs text-emerald-500 mt-1">Under capacity</div>
                </div>
              </div>
              {/* Mock table rows */}
              <div className="rounded-lg border border-gray-800 bg-gray-900 divide-y divide-gray-800">
                {[
                  { name: "Checkout Redesign", status: "READY_FOR_DEV", weeks: "8.0 / 8.0", color: "emerald" },
                  { name: "Search Improvements", status: "PLANNING", weeks: "4.0 / 6.0", color: "amber" },
                  { name: "Admin Dashboard v2", status: "PLANNING", weeks: "6.0 / 8.0", color: "amber" },
                  { name: "Mobile Push Notifications", status: "READY_FOR_DEV", weeks: "4.0 / 4.0", color: "emerald" },
                ].map((row) => (
                  <div key={row.name} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${row.color === "emerald" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <span className="text-sm text-gray-200">{row.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        row.status === "READY_FOR_DEV"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {row.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">{row.weeks}w</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative px-6 py-32 border-t border-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything you need to run a cycle
            </h2>
            <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
              From shaping pitches to shipping product, every step of the Shape Up process in one tool.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1: Betting Table */}
            <div className="group rounded-xl border border-gray-800 bg-gray-900/50 p-8 hover:border-gray-700 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-100 mb-3">Betting Table</h3>
              <p className="text-gray-400 leading-relaxed">
                Evaluate pitches as a team before committing. Approve, reject, or hold work items
                with a clear visual of what makes the cut and what doesn&apos;t.
              </p>
            </div>

            {/* Feature 2: Capacity Planning */}
            <div className="group rounded-xl border border-gray-800 bg-gray-900/50 p-8 hover:border-gray-700 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-100 mb-3">Capacity Planning</h3>
              <p className="text-gray-400 leading-relaxed">
                Set engineer availability per cycle and see real-time balance between available weeks
                and required effort. Drag and drop engineers onto pitches.
              </p>
            </div>

            {/* Feature 3: AI Staff Plan */}
            <div className="group rounded-xl border border-gray-800 bg-gray-900/50 p-8 hover:border-gray-700 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-100 mb-3">AI Staff Plan</h3>
              <p className="text-gray-400 leading-relaxed">
                Let AI generate a staffing recommendation that respects capacity, priorities, and
                individual preferences. Review, tweak, and approve before it goes live.
              </p>
            </div>

            {/* Feature 4: Team Signups */}
            <div className="group rounded-xl border border-gray-800 bg-gray-900/50 p-8 hover:border-gray-700 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-100 mb-3">Team Signups</h3>
              <p className="text-gray-400 leading-relaxed">
                Share a public link where engineers pick their 1st, 2nd, and 3rd choice pitches.
                No login required. Preferences feed directly into AI staffing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="relative px-6 py-32 border-t border-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
              Four steps from idea to fully-staffed cycle.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Shape pitches",
                description: "Define work, set estimates, and assign product managers and designers.",
                color: "violet",
              },
              {
                step: "02",
                title: "Bet at the table",
                description: "Review pitched work together. Approve what makes the cut for this cycle.",
                color: "emerald",
              },
              {
                step: "03",
                title: "Collect preferences",
                description: "Share a signup link. Engineers pick what they want to work on.",
                color: "blue",
              },
              {
                step: "04",
                title: "AI staffs the plan",
                description: "Generate a recommendation, review it, make changes, and approve.",
                color: "amber",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className={`text-5xl font-bold mb-4 ${
                  item.color === "violet" ? "text-violet-500/20" :
                  item.color === "emerald" ? "text-emerald-500/20" :
                  item.color === "blue" ? "text-blue-500/20" :
                  "text-amber-500/20"
                }`}>
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 py-32 border-t border-gray-800/50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-15">
            <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-violet-600 rounded-full blur-[128px]" />
            <div className="absolute bottom-16 right-1/4 w-64 h-64 bg-blue-600 rounded-full blur-[128px]" />
          </div>
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to plan your next cycle?
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Set up your team, shape your pitches, and let AI handle the staffing puzzle.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/sign-up" className="btn-primary px-8 py-3 text-base">
              Get started for free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h-1a1 1 0 00-1 1v8a1 1 0 001 1h1m0-10v10m0-10h2a1 1 0 011 1v8a1 1 0 01-1 1H6m12-10h1a1 1 0 011 1v8a1 1 0 01-1 1h-1m0-10v10m0-10h-2a1 1 0 00-1 1v8a1 1 0 001 1h2M9 12h6" />
            </svg>
            <span className="text-sm text-gray-500">Cycles</span>
          </div>
          <p className="text-sm text-gray-600">
            Shape Up planning for modern teams
          </p>
        </div>
      </footer>
    </div>
  );
}
