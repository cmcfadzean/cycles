import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/types";

// This is a PUBLIC endpoint - no authentication required
// Used by the signup page to display approved pitches and collect preferences

// GET - Fetch cycle info and approved pitches for signup
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cycle = await prisma.cycle.findUnique({
      where: { id },
      include: {
        pitches: {
          include: {
            productManager: true,
            productDesigner: true,
          },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // Return only the info needed for the signup page
    const pitches = cycle.pitches.map((pitch) => ({
      id: pitch.id,
      title: pitch.title,
      estimateWeeks: toNumber(pitch.estimateWeeks),
      pitchDocUrl: pitch.pitchDocUrl,
      notes: pitch.notes,
      productManagerName: pitch.productManager?.name ?? null,
      productDesignerName: pitch.productDesigner?.name ?? null,
    }));

    return NextResponse.json({
      id: cycle.id,
      name: cycle.name,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      description: cycle.description,
      pitches,
    });
  } catch (error) {
    console.error("Failed to fetch cycle for signup:", error);
    return NextResponse.json(
      { error: "Failed to fetch cycle" },
      { status: 500 }
    );
  }
}

// POST - Submit a pitch signup
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cycleId } = await params;
    const body = await request.json();

    const { personName, firstChoicePitchId, secondChoicePitchId, thirdChoicePitchId } = body;

    // Validate required fields
    if (!personName?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!firstChoicePitchId || !secondChoicePitchId || !thirdChoicePitchId) {
      return NextResponse.json(
        { error: "All three choices are required" },
        { status: 400 }
      );
    }

    // Validate all choices are different
    const choices = [firstChoicePitchId, secondChoicePitchId, thirdChoicePitchId];
    if (new Set(choices).size !== 3) {
      return NextResponse.json(
        { error: "All three choices must be different pitches" },
        { status: 400 }
      );
    }

    // Verify cycle exists
    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
      include: {
        pitches: { select: { id: true } },
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // Verify all chosen pitches belong to this cycle
    const cyclePitchIds = new Set(cycle.pitches.map((p) => p.id));
    for (const choiceId of choices) {
      if (!cyclePitchIds.has(choiceId)) {
        return NextResponse.json(
          { error: "One or more selected pitches are not in this cycle" },
          { status: 400 }
        );
      }
    }

    // Create the signup
    const signup = await prisma.pitchSignup.create({
      data: {
        cycleId,
        personName: personName.trim(),
        firstChoicePitchId,
        secondChoicePitchId,
        thirdChoicePitchId,
      },
    });

    return NextResponse.json({ success: true, id: signup.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create pitch signup:", error);
    return NextResponse.json(
      { error: "Failed to submit signup" },
      { status: 500 }
    );
  }
}

