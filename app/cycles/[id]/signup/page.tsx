"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

interface SignupPitch {
  id: string;
  title: string;
  estimateWeeks: number;
  pitchDocUrl: string | null;
  notes: string | null;
  productManagerName: string | null;
  productDesignerName: string | null;
}

interface CycleInfo {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description: string | null;
  pitches: SignupPitch[];
}

type ChoiceRank = "first" | "second" | "third";

const CHOICE_CONFIG: Record<
  ChoiceRank,
  { label: string; emoji: string; color: string; bgColor: string; ringColor: string }
> = {
  first: {
    label: "1st Choice",
    emoji: "🥇",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10 border-yellow-500/40",
    ringColor: "ring-yellow-500/50",
  },
  second: {
    label: "2nd Choice",
    emoji: "🥈",
    color: "text-gray-300",
    bgColor: "bg-gray-400/10 border-gray-400/40",
    ringColor: "ring-gray-400/50",
  },
  third: {
    label: "3rd Choice",
    emoji: "🥉",
    color: "text-amber-600",
    bgColor: "bg-amber-700/10 border-amber-600/40",
    ringColor: "ring-amber-600/50",
  },
};

export default function SignupPage() {
  const params = useParams();
  const cycleId = params.id as string;

  // State
  const [cycle, setCycle] = useState<CycleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<"name" | "choices" | "done">("name");
  const [personName, setPersonName] = useState("");
  const [choices, setChoices] = useState<{
    first: string | null;
    second: string | null;
    third: string | null;
  }>({ first: null, second: null, third: null });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch cycle data
  const fetchCycle = useCallback(async () => {
    try {
      const res = await fetch(`/api/cycles/${cycleId}/signup`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Cycle not found");
        } else {
          throw new Error("Failed to fetch cycle");
        }
        return;
      }
      const data = await res.json();
      setCycle(data);
    } catch {
      setError("Failed to load cycle");
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    fetchCycle();
  }, [fetchCycle]);

  // Determine what rank a pitch currently holds
  function getRankForPitch(pitchId: string): ChoiceRank | null {
    if (choices.first === pitchId) return "first";
    if (choices.second === pitchId) return "second";
    if (choices.third === pitchId) return "third";
    return null;
  }

  // Get next available slot
  function getNextSlot(): ChoiceRank | null {
    if (!choices.first) return "first";
    if (!choices.second) return "second";
    if (!choices.third) return "third";
    return null;
  }

  // Handle clicking a pitch card
  function handlePitchClick(pitchId: string) {
    const currentRank = getRankForPitch(pitchId);

    if (currentRank) {
      // Deselect it
      setChoices((prev) => ({ ...prev, [currentRank]: null }));
    } else {
      // Assign to next available slot
      const nextSlot = getNextSlot();
      if (nextSlot) {
        setChoices((prev) => ({ ...prev, [nextSlot]: pitchId }));
      }
    }
  }

  // Handle submit
  async function handleSubmit() {
    if (!choices.first || !choices.second || !choices.third) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/cycles/${cycleId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personName: personName.trim(),
          firstChoicePitchId: choices.first,
          secondChoicePitchId: choices.second,
          thirdChoicePitchId: choices.third,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit signup");
      }

      setStep("done");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit signup"
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Helper to get pitch by id
  function getPitch(id: string | null): SignupPitch | undefined {
    if (!id || !cycle) return undefined;
    return cycle.pitches.find((p) => p.id === id);
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-gray-300 rounded-full" />
      </div>
    );
  }

  // Error state
  if (error || !cycle) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-gray-400">{error || "Cycle not found"}</p>
        </div>
      </div>
    );
  }

  // No pitches
  if (cycle.pitches.length < 3) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
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
          <h2 className="text-lg font-semibold text-white mb-2">
            Not enough pitches yet
          </h2>
          <p className="text-gray-500">
            This cycle needs at least 3 approved pitches before signups can
            begin.
          </p>
        </div>
      </div>
    );
  }

  // ─── STEP: Name Entry ─────────────────────────────────────────────
  if (step === "name") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Pitch Signup
            </h1>
            <p className="text-gray-400">
              <span className="font-medium text-gray-300">{cycle.name}</span>
            </p>
            {cycle.description && (
              <p className="text-sm text-gray-500 mt-2">{cycle.description}</p>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              What&apos;s your name?
            </label>
            <input
              id="name"
              type="text"
              autoFocus
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && personName.trim()) {
                  setStep("choices");
                }
              }}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => setStep("choices")}
              disabled={!personName.trim()}
              className="mt-4 w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>

          <p className="text-center text-xs text-gray-600 mt-4">
            You&apos;ll pick your top 3 pitch preferences next
          </p>
        </div>
      </div>
    );
  }

  // ─── STEP: Pick Choices ───────────────────────────────────────────
  if (step === "choices") {
    const allChosen = choices.first && choices.second && choices.third;

    return (
      <div className="min-h-screen bg-gray-950">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-white">
                  Pick your pitches
                </h1>
                <p className="text-sm text-gray-400">
                  Hey{" "}
                  <span className="text-gray-300 font-medium">
                    {personName}
                  </span>
                  , select your 1st, 2nd, and 3rd choice
                </p>
              </div>
              <button
                onClick={() => setStep("name")}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                ← Back
              </button>
            </div>

            {/* Choice slots */}
            <div className="flex gap-3 mt-4">
              {(["first", "second", "third"] as ChoiceRank[]).map((rank) => {
                const config = CHOICE_CONFIG[rank];
                const pitch = getPitch(choices[rank]);

                return (
                  <div
                    key={rank}
                    className={`flex-1 rounded-lg border px-3 py-2 min-h-[52px] flex items-center gap-2 transition-all ${
                      pitch
                        ? config.bgColor
                        : "border-gray-700 border-dashed bg-gray-900/50"
                    }`}
                  >
                    <span className="text-lg">{config.emoji}</span>
                    {pitch ? (
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <span className="text-sm text-white truncate">
                          {pitch.title}
                        </span>
                        <button
                          onClick={() =>
                            setChoices((prev) => ({ ...prev, [rank]: null }))
                          }
                          className="text-gray-500 hover:text-gray-300 flex-shrink-0"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {config.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pitch Cards */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {cycle.pitches.map((pitch) => {
              const rank = getRankForPitch(pitch.id);
              const config = rank ? CHOICE_CONFIG[rank] : null;
              const isSelected = !!rank;
              const slotsFullAndNotSelected = !isSelected && !getNextSlot();

              return (
                <button
                  key={pitch.id}
                  onClick={() => handlePitchClick(pitch.id)}
                  disabled={slotsFullAndNotSelected}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    isSelected
                      ? `${config!.bgColor} ring-2 ${config!.ringColor}`
                      : slotsFullAndNotSelected
                      ? "border-gray-800 bg-gray-900/30 opacity-40 cursor-not-allowed"
                      : "border-gray-800 bg-gray-900 hover:border-gray-600 hover:bg-gray-800/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">
                          {pitch.title}
                        </h3>
                        {isSelected && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${config!.bgColor} ${config!.color}`}
                          >
                            {config!.emoji} {config!.label}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                        <span>{pitch.estimateWeeks}w estimate</span>
                        {pitch.productManagerName && (
                          <span>PM: {pitch.productManagerName}</span>
                        )}
                        {pitch.productDesignerName && (
                          <span>Design: {pitch.productDesignerName}</span>
                        )}
                      </div>

                      {pitch.notes && (
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {pitch.notes}
                        </p>
                      )}
                    </div>

                    {pitch.pitchDocUrl && (
                      <a
                        href={pitch.pitchDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 p-1.5 text-gray-500 hover:text-blue-400 transition-colors"
                        title="View pitch document"
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
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Submit section */}
          <div className="mt-8 pb-8">
            {submitError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {submitError}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!allChosen || submitting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-white rounded-full" />
                  Submitting...
                </>
              ) : (
                "Submit My Choices"
              )}
            </button>
            {!allChosen && (
              <p className="text-center text-sm text-gray-500 mt-2">
                Select all 3 choices to submit
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP: Confirmation ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          You&apos;re all set, {personName}!
        </h1>
        <p className="text-gray-400 mb-8">
          Your pitch preferences have been submitted.
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-left space-y-3">
          {(["first", "second", "third"] as ChoiceRank[]).map((rank) => {
            const config = CHOICE_CONFIG[rank];
            const pitch = getPitch(choices[rank]);
            if (!pitch) return null;

            return (
              <div
                key={rank}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${config.bgColor}`}
              >
                <span className="text-xl">{config.emoji}</span>
                <div>
                  <p className="text-sm text-gray-400">{config.label}</p>
                  <p className="text-white font-medium">{pitch.title}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-600 mt-6">
          {cycle.name}
        </p>
      </div>
    </div>
  );
}

