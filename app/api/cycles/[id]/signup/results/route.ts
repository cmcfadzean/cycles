import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth";

// Authenticated endpoint — returns all signups for a cycle with pitch titles resolved
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id: cycleId } = await params;

    // Verify cycle belongs to organization
    const cycle = await prisma.cycle.findFirst({
      where: {
        id: cycleId,
        organizationId: organization.id,
      },
      include: {
        pitches: {
          select: { id: true, title: true },
        },
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // Build a pitch ID → title lookup
    const pitchMap = new Map(cycle.pitches.map((p) => [p.id, p.title]));

    // Get all signups for this cycle
    const signups = await prisma.pitchSignup.findMany({
      where: { cycleId },
      orderBy: { createdAt: "desc" },
    });

    const results = signups.map((s) => ({
      id: s.id,
      personName: s.personName,
      firstChoice: {
        pitchId: s.firstChoicePitchId,
        pitchTitle: pitchMap.get(s.firstChoicePitchId) ?? "Unknown pitch",
      },
      secondChoice: {
        pitchId: s.secondChoicePitchId,
        pitchTitle: pitchMap.get(s.secondChoicePitchId) ?? "Unknown pitch",
      },
      thirdChoice: {
        pitchId: s.thirdChoicePitchId,
        pitchTitle: pitchMap.get(s.thirdChoicePitchId) ?? "Unknown pitch",
      },
      createdAt: s.createdAt,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Failed to fetch signups:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch signups" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a signup submission
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id: cycleId } = await params;
    const { searchParams } = new URL(request.url);
    const signupId = searchParams.get("signupId");

    if (!signupId) {
      return NextResponse.json(
        { error: "signupId is required" },
        { status: 400 }
      );
    }

    // Verify cycle belongs to organization
    const cycle = await prisma.cycle.findFirst({
      where: {
        id: cycleId,
        organizationId: organization.id,
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // Verify signup exists and belongs to this cycle
    const signup = await prisma.pitchSignup.findFirst({
      where: { id: signupId, cycleId },
    });

    if (!signup) {
      return NextResponse.json({ error: "Signup not found" }, { status: 404 });
    }

    await prisma.pitchSignup.delete({
      where: { id: signupId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete signup:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete signup" },
      { status: 500 }
    );
  }
}

