import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOpenAI } from "@/lib/openai";
import { requireOrganization } from "@/lib/auth";
import { toNumber } from "@/lib/types";

interface DraftAssignment {
  engineerId: string;
  engineerName: string;
  pitchId: string;
  pitchTitle: string;
  weeksAllocated: number;
}

// GET: Fetch the latest draft recommendation for this cycle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOrganization();
    const { id } = await params;

    const recommendation = await prisma.staffingRecommendation.findFirst({
      where: { cycleId: id, status: "draft" },
      orderBy: { createdAt: "desc" },
    });

    if (!recommendation) {
      return NextResponse.json({ recommendation: null });
    }

    return NextResponse.json({
      recommendation: {
        ...recommendation,
        assignments: JSON.parse(recommendation.assignments),
      },
    });
  } catch (error) {
    console.error("Failed to fetch staffing recommendation:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch recommendation" },
      { status: 500 }
    );
  }
}

// Round to nearest 0.5
function round05(n: number): number {
  return Math.round(n * 2) / 2;
}

// Use AI only for fuzzy name matching — returns a map of signupName → engineerId
async function matchSignupNamesToEngineers(
  signupNames: string[],
  engineers: { engineerId: string; engineerName: string }[]
): Promise<Map<string, string>> {
  if (signupNames.length === 0) return new Map();

  const prompt = `Match each signup name to the most likely engineer from the list below. People may use first names, nicknames, or partial names. Return a JSON object mapping each signup name to the engineer's id, or null if no match.

Signup names: ${JSON.stringify(signupNames)}

Engineers:
${engineers.map((e) => `- "${e.engineerName}" (id: "${e.engineerId}")`).join("\n")}

Return: { "matches": { "signup name": "engineerId or null" } }
Only return valid JSON, no markdown.`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0,
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) return new Map();
    const parsed = JSON.parse(content);
    const result = new Map<string, string>();
    for (const [name, id] of Object.entries(parsed.matches || {})) {
      if (typeof id === "string" && engineers.some((e) => e.engineerId === id)) {
        result.set(name, id);
      }
    }
    return result;
  } catch {
    return new Map();
  }
}

// POST: Generate a new staffing recommendation
// AI handles ONLY name matching. All math is deterministic code.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id } = await params;

    const cycle = await prisma.cycle.findFirst({
      where: { id, organizationId: organization.id },
      include: {
        capacities: { include: { engineer: true } },
        pitches: {
          include: { assignments: { include: { engineer: true } } },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    const signups = await prisma.pitchSignup.findMany({
      where: { cycleId: id },
    });

    const engineers = cycle.capacities.map((cap) => ({
      engineerId: cap.engineer.id,
      engineerName: cap.engineer.name,
      availableWeeks: toNumber(cap.availableWeeks),
    }));

    const pitches = cycle.pitches.map((pitch, index) => ({
      pitchId: pitch.id,
      pitchTitle: pitch.title,
      estimateWeeks: toNumber(pitch.estimateWeeks),
      priority: pitch.priority ?? index + 1,
    }));

    if (engineers.length === 0 || pitches.length === 0) {
      return NextResponse.json(
        { error: "Need at least one engineer and one pitch to generate a plan" },
        { status: 400 }
      );
    }

    // --- Step 1: AI name matching ---
    const signupNames = signups.map((s) => s.personName);
    const nameMatches = await matchSignupNamesToEngineers(signupNames, engineers);

    // Build preference map: engineerId → [pitchId1, pitchId2, pitchId3]
    const preferences = new Map<string, string[]>();
    const preferenceLog: string[] = [];

    for (const signup of signups) {
      const engineerId = nameMatches.get(signup.personName);
      if (!engineerId) {
        preferenceLog.push(`"${signup.personName}" — no matching engineer found`);
        continue;
      }
      const eng = engineers.find((e) => e.engineerId === engineerId);
      if (!eng) continue;
      preferences.set(engineerId, [
        signup.firstChoicePitchId,
        signup.secondChoicePitchId,
        signup.thirdChoicePitchId,
      ].filter((pid) => pitches.some((p) => p.pitchId === pid)));
      preferenceLog.push(`"${signup.personName}" → ${eng.engineerName}`);
    }

    // --- Step 2: Deterministic staffing algorithm ---
    const pitchRemaining = new Map<string, number>();
    for (const p of pitches) pitchRemaining.set(p.pitchId, p.estimateWeeks);

    const engineerRemaining = new Map<string, number>();
    for (const e of engineers) engineerRemaining.set(e.engineerId, e.availableWeeks);

    const assignments: DraftAssignment[] = [];
    const reasoningNotes: string[] = [];

    function allocate(engineerId: string, pitchId: string, weeks: number) {
      if (weeks <= 0) return;
      weeks = round05(weeks);
      if (weeks <= 0) return;
      const eng = engineers.find((e) => e.engineerId === engineerId)!;
      const pit = pitches.find((p) => p.pitchId === pitchId)!;
      const existing = assignments.find(
        (a) => a.engineerId === engineerId && a.pitchId === pitchId
      );
      if (existing) {
        existing.weeksAllocated += weeks;
      } else {
        assignments.push({
          engineerId,
          engineerName: eng.engineerName,
          pitchId,
          pitchTitle: pit.pitchTitle,
          weeksAllocated: weeks,
        });
      }
      engineerRemaining.set(engineerId, (engineerRemaining.get(engineerId) || 0) - weeks);
      pitchRemaining.set(pitchId, (pitchRemaining.get(pitchId) || 0) - weeks);
    }

    // Step 2a: Place engineers with preferences on their preferred pitches
    const engWithPrefs = engineers.filter((e) => preferences.has(e.engineerId));
    const engWithoutPrefs = engineers.filter((e) => !preferences.has(e.engineerId));

    for (const eng of engWithPrefs) {
      const prefs = preferences.get(eng.engineerId) || [];
      let remaining = engineerRemaining.get(eng.engineerId) || 0;
      if (remaining <= 0) continue;

      for (const pitchId of prefs) {
        const pitchNeed = pitchRemaining.get(pitchId) || 0;
        if (pitchNeed <= 0 || remaining <= 0) continue;

        const toAllocate = round05(Math.min(remaining, pitchNeed));
        if (toAllocate <= 0) continue;

        allocate(eng.engineerId, pitchId, toAllocate);
        remaining = engineerRemaining.get(eng.engineerId) || 0;

        const choiceNum = prefs.indexOf(pitchId) + 1;
        const pitchTitle = pitches.find((p) => p.pitchId === pitchId)?.pitchTitle;
        reasoningNotes.push(
          `${eng.engineerName} → "${pitchTitle}" (choice #${choiceNum}, ${toAllocate}w)`
        );
      }
    }

    // Step 2b: Fill remaining pitch needs with remaining engineer capacity
    // Sort pitches by priority so higher-priority pitches get filled first
    const pitchesByPriority = [...pitches].sort((a, b) => a.priority - b.priority);

    for (const pitch of pitchesByPriority) {
      let need = pitchRemaining.get(pitch.pitchId) || 0;
      if (need <= 0) continue;

      // Prefer engineers who already have leftover capacity, starting with those
      // who had preferences for this pitch but couldn't fully fill it, then others
      const availableEngineers = [...engWithPrefs, ...engWithoutPrefs].filter(
        (e) => (engineerRemaining.get(e.engineerId) || 0) > 0
      );

      for (const eng of availableEngineers) {
        if (need <= 0) break;
        const engLeft = engineerRemaining.get(eng.engineerId) || 0;
        if (engLeft <= 0) continue;

        const toAllocate = round05(Math.min(engLeft, need));
        if (toAllocate <= 0) continue;

        allocate(eng.engineerId, pitch.pitchId, toAllocate);
        need = pitchRemaining.get(pitch.pitchId) || 0;
      }
    }

    // Step 2c: Handle surplus — if engineers still have capacity after all pitches are staffed,
    // distribute across pitches proportionally (highest priority first)
    const surplusEngineers = engineers.filter(
      (e) => (engineerRemaining.get(e.engineerId) || 0) > 0
    );

    if (surplusEngineers.length > 0) {
      for (const eng of surplusEngineers) {
        let remaining = engineerRemaining.get(eng.engineerId) || 0;
        if (remaining <= 0) continue;

        for (const pitch of pitchesByPriority) {
          if (remaining <= 0) break;
          const toAllocate = round05(remaining);
          if (toAllocate <= 0) break;
          allocate(eng.engineerId, pitch.pitchId, toAllocate);
          remaining = engineerRemaining.get(eng.engineerId) || 0;
        }
      }
    }

    // --- Step 3: Build reasoning ---
    const totalCapacity = engineers.reduce((s, e) => s + e.availableWeeks, 0);
    const totalRequired = pitches.reduce((s, p) => s + p.estimateWeeks, 0);
    const totalAllocated = assignments.reduce((s, a) => s + a.weeksAllocated, 0);

    const reasoningParts: string[] = [];

    if (preferenceLog.length > 0) {
      reasoningParts.push(`Name matching: ${preferenceLog.join("; ")}.`);
    }
    if (reasoningNotes.length > 0) {
      reasoningParts.push(`Preference assignments: ${reasoningNotes.join("; ")}.`);
    }
    if (totalCapacity > totalRequired) {
      reasoningParts.push(
        `${(totalCapacity - totalRequired).toFixed(1)}w surplus distributed across pitches.`
      );
    } else if (totalCapacity < totalRequired) {
      reasoningParts.push(
        `${(totalRequired - totalCapacity).toFixed(1)}w deficit — lower-priority pitches may be understaffed.`
      );
    }
    reasoningParts.push(
      `${totalAllocated.toFixed(1)}w allocated across ${assignments.length} assignments.`
    );

    const reasoning = reasoningParts.join(" ");

    // Delete any existing drafts for this cycle
    await prisma.staffingRecommendation.deleteMany({
      where: { cycleId: id, status: "draft" },
    });

    const recommendation = await prisma.staffingRecommendation.create({
      data: {
        cycleId: id,
        status: "draft",
        assignments: JSON.stringify(assignments),
        reasoning,
      },
    });

    return NextResponse.json({
      recommendation: {
        ...recommendation,
        assignments,
      },
    });
  } catch (error) {
    console.error("Failed to generate staffing recommendation:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to generate recommendation" },
      { status: 500 }
    );
  }
}

// PATCH: Update assignments in an existing draft
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOrganization();
    const { id } = await params;
    const body = await request.json();

    const recommendation = await prisma.staffingRecommendation.findFirst({
      where: { cycleId: id, status: "draft" },
      orderBy: { createdAt: "desc" },
    });

    if (!recommendation) {
      return NextResponse.json(
        { error: "No draft recommendation found" },
        { status: 404 }
      );
    }

    const updated = await prisma.staffingRecommendation.update({
      where: { id: recommendation.id },
      data: {
        assignments: JSON.stringify(body.assignments),
      },
    });

    return NextResponse.json({
      recommendation: {
        ...updated,
        assignments: JSON.parse(updated.assignments),
      },
    });
  } catch (error) {
    console.error("Failed to update staffing recommendation:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update recommendation" },
      { status: 500 }
    );
  }
}

// DELETE: Discard a draft recommendation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOrganization();
    const { id } = await params;

    await prisma.staffingRecommendation.deleteMany({
      where: { cycleId: id, status: "draft" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete staffing recommendation:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete recommendation" },
      { status: 500 }
    );
  }
}
