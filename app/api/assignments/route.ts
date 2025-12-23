import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateAssignmentRequest, toNumber } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: CreateAssignmentRequest = await request.json();

    if (
      !body.cycleId ||
      !body.engineerId ||
      !body.pitchId ||
      body.weeksAllocated === undefined
    ) {
      return NextResponse.json(
        {
          error: "cycleId, engineerId, pitchId, and weeksAllocated are required",
        },
        { status: 400 }
      );
    }

    if (body.weeksAllocated <= 0) {
      return NextResponse.json(
        { error: "weeksAllocated must be greater than 0" },
        { status: 400 }
      );
    }

    // Verify cycle exists
    const cycle = await prisma.cycle.findUnique({
      where: { id: body.cycleId },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // Verify engineer exists and get their capacity
    const capacity = await prisma.engineerCycleCapacity.findUnique({
      where: {
        engineerId_cycleId: {
          engineerId: body.engineerId,
          cycleId: body.cycleId,
        },
      },
    });

    if (!capacity) {
      return NextResponse.json(
        { error: "Engineer does not have capacity in this cycle" },
        { status: 400 }
      );
    }

    // Verify pitch exists and is in the same cycle
    const pitch = await prisma.pitch.findUnique({
      where: { id: body.pitchId },
    });

    if (!pitch) {
      return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
    }

    if (pitch.cycleId !== body.cycleId) {
      return NextResponse.json(
        { error: "Pitch is not in the specified cycle" },
        { status: 400 }
      );
    }

    // Check existing assignment for this engineer-pitch combo
    const existingAssignment = await prisma.assignment.findUnique({
      where: {
        cycleId_engineerId_pitchId: {
          cycleId: body.cycleId,
          engineerId: body.engineerId,
          pitchId: body.pitchId,
        },
      },
    });

    // Get all current assignments for this engineer in this cycle
    const engineerAssignments = await prisma.assignment.findMany({
      where: {
        cycleId: body.cycleId,
        engineerId: body.engineerId,
      },
    });

    // Calculate current assigned weeks (excluding the existing assignment if updating)
    const currentAssignedWeeks = engineerAssignments
      .filter((a) => a.id !== existingAssignment?.id)
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
        pitchId: body.pitchId,
      },
    });

    // Calculate current assigned weeks for the pitch (excluding the existing assignment if updating)
    const currentPitchAssignedWeeks = pitchAssignments
      .filter((a) => a.id !== existingAssignment?.id)
      .reduce((sum, a) => sum + toNumber(a.weeksAllocated), 0);

    const estimateWeeks = toNumber(pitch.estimateWeeks);
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

    // Upsert the assignment
    const assignment = await prisma.assignment.upsert({
      where: {
        cycleId_engineerId_pitchId: {
          cycleId: body.cycleId,
          engineerId: body.engineerId,
          pitchId: body.pitchId,
        },
      },
      update: {
        weeksAllocated: body.weeksAllocated,
      },
      create: {
        cycleId: body.cycleId,
        engineerId: body.engineerId,
        pitchId: body.pitchId,
        weeksAllocated: body.weeksAllocated,
      },
      include: {
        engineer: true,
        pitch: true,
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Failed to create assignment:", error);
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}




