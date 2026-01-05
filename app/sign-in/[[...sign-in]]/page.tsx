"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-neutral-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">Cycles</span>
          </div>
          <p className="text-neutral-400">Shape Up Planning Made Simple</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-neutral-900 border border-neutral-800 shadow-2xl",
              headerTitle: "text-white",
              headerSubtitle: "text-neutral-400",
              socialButtonsBlockButton:
                "bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700",
              socialButtonsBlockButtonText: "text-white",
              dividerLine: "bg-neutral-700",
              dividerText: "text-neutral-500",
              formFieldLabel: "text-neutral-300",
              formFieldInput:
                "bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500",
              formButtonPrimary:
                "bg-violet-600 hover:bg-violet-500 text-white",
              footerActionLink: "text-violet-400 hover:text-violet-300",
              identityPreviewText: "text-neutral-300",
              identityPreviewEditButton: "text-violet-400",
            },
          }}
        />
      </div>
    </div>
  );
}

