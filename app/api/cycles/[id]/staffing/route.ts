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

// POST: Generate a new AI staffing recommendation
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

    // Fetch signup preferences for this cycle
    const signups = await prisma.pitchSignup.findMany({
      where: { cycleId: id },
    });

    const pitchTitleMap = new Map(
      cycle.pitches.map((p) => [p.id, p.title])
    );

    const signupPreferences = signups.map((s) => ({
      personName: s.personName,
      firstChoice: pitchTitleMap.get(s.firstChoicePitchId) ?? "Unknown",
      secondChoice: pitchTitleMap.get(s.secondChoicePitchId) ?? "Unknown",
      thirdChoice: pitchTitleMap.get(s.thirdChoicePitchId) ?? "Unknown",
    }));

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

    const totalCapacity = engineers.reduce((s, e) => s + e.availableWeeks, 0);
    const totalRequired = pitches.reduce((s, p) => s + p.estimateWeeks, 0);

    const prompt = `You are a staffing planner for an engineering team. You MUST produce a complete staffing plan that allocates ALL engineers and fully staffs ALL pitches.

PRIORITY #1 — FULL COVERAGE (non-negotiable):
- Every single pitch MUST be fully staffed: the sum of weeksAllocated for each pitch MUST equal its estimateWeeks exactly.
- Every single engineer MUST be allocated: the sum of weeksAllocated for each engineer MUST equal their availableWeeks exactly.
- An engineer's total allocated weeks MUST NOT exceed their availableWeeks.
- weeksAllocated must be a positive number in 0.5 increments (minimum 0.5).
${totalCapacity > totalRequired ? `- There are ${(totalCapacity - totalRequired).toFixed(1)} surplus weeks. Distribute the extra across pitches proportionally (some pitches may get slightly more than their estimate). Every engineer-week must be used.` : ""}
${totalCapacity < totalRequired ? `- There is a deficit of ${(totalRequired - totalCapacity).toFixed(1)} weeks. Some lower-priority pitches may be understaffed, but allocate every available engineer-week. Staff higher-priority pitches (lower priority number) fully first.` : ""}

PRIORITY #2 — ENGINEER HAPPINESS (best effort):
${signupPreferences.length > 0 ? `Engineers submitted signup preferences for which pitches they want to work on. Match each person name below to the closest engineer by name (fuzzy match — e.g. "Court" matches "Court McFadzean"). Try to put engineers on their 1st choice pitch. If that's not possible, try 2nd choice, then 3rd. This is secondary to full coverage — never leave a pitch understaffed or an engineer unallocated just to honor a preference.` : "No signup preferences were submitted. Assign engineers to pitches purely based on coverage needs."}

PRIORITY #3 — CONTINUITY (tie-breaker):
- When possible, prefer assigning an engineer to fewer pitches (ideally one) so they can focus deeply. But splitting across 2-3 pitches is fine and expected to achieve full coverage.
- Higher priority pitches (lower priority number) should be prioritized if there is a capacity deficit.

SUMMARY:
- Total engineer capacity: ${totalCapacity.toFixed(1)} weeks
- Total pitch estimates: ${totalRequired.toFixed(1)} weeks
- Engineers: ${engineers.length}
- Pitches: ${pitches.length}
${signupPreferences.length > 0 ? `
SIGNUP PREFERENCES:
${signupPreferences.map((s) => `- ${s.personName}: 1st "${s.firstChoice}", 2nd "${s.secondChoice}", 3rd "${s.thirdChoice}"`).join("\n")}
` : ""}
ENGINEERS:
${engineers.map((e) => `- ${e.engineerName} (id: ${e.engineerId}): ${e.availableWeeks} weeks available`).join("\n")}

PITCHES (ordered by priority):
${pitches.map((p) => `- ${p.pitchTitle} (id: ${p.pitchId}): ${p.estimateWeeks} weeks estimated, priority ${p.priority}`).join("\n")}

VALIDATION — Before returning, verify:
1. For each engineer, sum their weeksAllocated. It MUST equal their availableWeeks.
2. For each pitch, sum its weeksAllocated. It MUST equal its estimateWeeks (unless deficit makes it impossible).
3. No engineer is missing from the assignments.
4. No pitch is missing from the assignments.

Return a JSON object with this exact shape:
{
  "assignments": [
    { "engineerId": "...", "engineerName": "...", "pitchId": "...", "pitchTitle": "...", "weeksAllocated": <number> }
  ],
  "reasoning": "Brief explanation: which preferences were honored, which weren't and why, and how surplus/deficit was handled."
}

Only return valid JSON, no markdown formatting.`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "AI returned no response" },
        { status: 500 }
      );
    }

    let parsed: { assignments: DraftAssignment[]; reasoning: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON" },
        { status: 500 }
      );
    }

    // Validate assignments against actual data
    const engineerMap = new Map(engineers.map((e) => [e.engineerId, e]));
    const pitchMap = new Map(pitches.map((p) => [p.pitchId, p]));

    const validAssignments = parsed.assignments.filter(
      (a) => engineerMap.has(a.engineerId) && pitchMap.has(a.pitchId) && a.weeksAllocated > 0
    );

    // Delete any existing drafts for this cycle
    await prisma.staffingRecommendation.deleteMany({
      where: { cycleId: id, status: "draft" },
    });

    const recommendation = await prisma.staffingRecommendation.create({
      data: {
        cycleId: id,
        status: "draft",
        assignments: JSON.stringify(validAssignments),
        reasoning: parsed.reasoning || null,
      },
    });

    return NextResponse.json({
      recommendation: {
        ...recommendation,
        assignments: validAssignments,
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
