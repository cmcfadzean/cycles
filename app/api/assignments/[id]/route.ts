import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, requireAdmin } from "@/lib/auth";
import { UpdateAssignmentRequest, toNumber } from "@/lib/types";
import { updatePitchStatusBasedOnStaffing } from "@/lib/pitch-status";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id } = await params;
    const body: UpdateAssignmentRequest = await request.json();

    if (body.weeksAllocated === undefined) {
      return NextResponse.json(
        { error: "weeksAllocated is required" },
        { status: 400 }
      );
    }

    if (body.weeksAllocated <= 0) {
      return NextResponse.json(
        { error: "weeksAllocated must be greater than 0" },
        { status: 400 }
      );
    }

    // Get the existing assignment and verify it belongs to org through cycle
    const existing = await prisma.assignment.findFirst({
      where: {
        id,
        cycle: {
          organizationId: organization.id,
        },
      },
      include: {
        pitch: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Get engineer capacity
    const capacity = await prisma.engineerCycleCapacity.findUnique({
      where: {
        engineerId_cycleId: {
          engineerId: existing.engineerId,
          cycleId: existing.cycleId,
        },
      },
    });

    if (!capacity) {
      return NextResponse.json(
        { error: "Engineer capacity not found" },
        { status: 400 }
      );
    }

    // Get all current assignments for this engineer in this cycle
    const engineerAssignments = await prisma.assignment.findMany({
      where: {
        cycleId: existing.cycleId,
        engineerId: existing.engineerId,
      },
    });

    // Calculate current assigned weeks (excluding this assignment)
    const currentAssignedWeeks = engineerAssignments
      .filter((a) => a.id !== id)
      .reduce((sum, a) => sum + toNumber(a.weeksAllocated), 0);

    const availableWeeks = toNumber(capacity.availableWeeks);
    const newTotalAssigned = currentAssignedWeeks + body.weeksAllocated;

    if (newTotalAssigned > availableWeeks) {
      const remaining = availableWeeks - currentAssignedWeeks;
      return NextResponse.json(
        {
          error: `Cannot assign ${body.weeksAllocated} weeks. Engineer only has ${remaining.toFixed(1)} weeks available.`,
        },
        { status: 400 }
      );
    }

    // Get all current assignments for this pitch
    const pitchAssignments = await prisma.assignment.findMany({
      where: {
        pitchId: existing.pitchId,
      },
    });

    // Calculate current assigned weeks for the pitch (excluding this assignment)
    const currentPitchAssignedWeeks = pitchAssignments
      .filter((a) => a.id !== id)
      .reduce((sum, a) => sum + toNumber(a.weeksAllocated), 0);

    const estimateWeeks = toNumber(existing.pitch.estimateWeeks);
    const newPitchTotalAssigned = currentPitchAssignedWeeks + body.weeksAllocated;

    if (newPitchTotalAssigned > estimateWeeks) {
      const remaining = estimateWeeks - currentPitchAssignedWeeks;
      return NextResponse.json(
        {
          error: `Cannot assign ${body.weeksAllocated} weeks. Pitch only needs ${remaining.toFixed(1)} more weeks.`,
        },
        { status: 400 }
      );
    }

    const assignment = await prisma.assignment.update({
      where: { id },
      data: {
        weeksAllocated: body.weeksAllocated,
      },
      include: {
        engineer: true,
        pitch: true,
      },
    });

    // Update pitch status based on staffing level
    await updatePitchStatusBasedOnStaffing(existing.pitchId);

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Failed to update assignment:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireAdmin();
    const { id } = await params;

    // Verify assignment belongs to org through cycle
    const existing = await prisma.assignment.findFirst({
      where: {
        id,
        cycle: {
          organizationId: organization.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    const pitchId = existing.pitchId;

    await prisma.assignment.delete({
      where: { id },
    });

    // Update pitch status based on staffing level
    await updatePitchStatusBasedOnStaffing(pitchId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete assignment:", error);
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
