import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth";
import { updatePitchStatusBasedOnStaffing } from "@/lib/pitch-status";

interface DraftAssignment {
  engineerId: string;
  engineerName: string;
  pitchId: string;
  pitchTitle: string;
  weeksAllocated: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id: cycleId } = await params;

    // Verify cycle belongs to this organization
    const cycle = await prisma.cycle.findFirst({
      where: { id: cycleId, organizationId: organization.id },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    const recommendation = await prisma.staffingRecommendation.findFirst({
      where: { cycleId, status: "draft" },
      orderBy: { createdAt: "desc" },
    });

    if (!recommendation) {
      return NextResponse.json(
        { error: "No draft recommendation to approve" },
        { status: 404 }
      );
    }

    const assignments: DraftAssignment[] = JSON.parse(recommendation.assignments);
    const affectedPitchIds = new Set<string>();

    // Delete all existing assignments for this cycle first
    await prisma.assignment.deleteMany({
      where: { cycleId },
    });

    // Create new assignments from the recommendation
    for (const assignment of assignments) {
      await prisma.assignment.create({
        data: {
          cycleId,
          engineerId: assignment.engineerId,
          pitchId: assignment.pitchId,
          weeksAllocated: assignment.weeksAllocated,
        },
      });
      affectedPitchIds.add(assignment.pitchId);
    }

    // Mark recommendation as approved
    await prisma.staffingRecommendation.update({
      where: { id: recommendation.id },
      data: { status: "approved" },
    });

    // Update pitch statuses
    for (const pitchId of affectedPitchIds) {
      await updatePitchStatusBasedOnStaffing(pitchId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to approve staffing recommendation:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to approve recommendation" },
      { status: 500 }
    );
  }
}
