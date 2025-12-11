import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateAssignmentRequest, toNumber } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Get the existing assignment
    const existing = await prisma.assignment.findUnique({
      where: { id: params.id },
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
      .filter((a) => a.id !== params.id)
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
      .filter((a) => a.id !== params.id)
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
      where: { id: params.id },
      data: {
        weeksAllocated: body.weeksAllocated,
      },
      include: {
        engineer: true,
        pitch: true,
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Failed to update assignment:", error);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.assignment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete assignment:", error);
    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 }
    );
  }
}

