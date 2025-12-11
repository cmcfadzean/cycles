import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  toNumber,
  CycleDetail,
  EngineerWithCapacity,
  PitchWithAssignments,
  PitchStatus,
} from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cycle = await prisma.cycle.findUnique({
      where: { id: params.id },
      include: {
        capacities: {
          include: {
            engineer: true,
          },
        },
        pitches: {
          include: {
            assignments: {
              include: {
                engineer: true,
              },
            },
          },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        },
        assignments: true,
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // Calculate engineer capacities and assigned weeks
    const engineers: EngineerWithCapacity[] = cycle.capacities.map(
      (capacity) => {
        const assignedWeeks = cycle.assignments
          .filter((a) => a.engineerId === capacity.engineerId)
          .reduce((sum, a) => sum + toNumber(a.weeksAllocated), 0);

        const availableWeeks = toNumber(capacity.availableWeeks);

        return {
          id: capacity.engineer.id,
          name: capacity.engineer.name,
          email: capacity.engineer.email,
          active: capacity.engineer.active,
          availableWeeks,
          assignedWeeks,
          remainingWeeks: availableWeeks - assignedWeeks,
          capacityId: capacity.id,
        };
      }
    );

    // Calculate pitch assignments and remaining weeks
    const pitches: PitchWithAssignments[] = cycle.pitches.map((pitch) => {
      const assignedWeeks = pitch.assignments.reduce(
        (sum, a) => sum + toNumber(a.weeksAllocated),
        0
      );
      const estimateWeeks = toNumber(pitch.estimateWeeks);

      return {
        id: pitch.id,
        title: pitch.title,
        pitchDocUrl: pitch.pitchDocUrl,
        estimateWeeks,
        status: pitch.status as PitchStatus,
        priority: pitch.priority,
        notes: pitch.notes,
        assignedWeeks,
        remainingWeeks: estimateWeeks - assignedWeeks,
        assignments: pitch.assignments.map((a) => ({
          id: a.id,
          engineerId: a.engineerId,
          engineerName: a.engineer.name,
          weeksAllocated: toNumber(a.weeksAllocated),
        })),
      };
    });

    const totalAvailableWeeks = engineers.reduce(
      (sum, e) => sum + e.availableWeeks,
      0
    );
    const totalRequiredWeeks = pitches.reduce(
      (sum, p) => sum + p.estimateWeeks,
      0
    );

    const cycleDetail: CycleDetail = {
      id: cycle.id,
      name: cycle.name,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      description: cycle.description,
      totalAvailableWeeks,
      totalRequiredWeeks,
      surplusOrDeficit: totalAvailableWeeks - totalRequiredWeeks,
      engineers,
      pitches,
    };

    return NextResponse.json(cycleDetail);
  } catch (error) {
    console.error("Failed to fetch cycle:", error);
    return NextResponse.json(
      { error: "Failed to fetch cycle" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.startDate !== undefined)
      updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate);
    if (body.description !== undefined) updateData.description = body.description;

    const cycle = await prisma.cycle.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(cycle);
  } catch (error) {
    console.error("Failed to update cycle:", error);
    return NextResponse.json(
      { error: "Failed to update cycle" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.cycle.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete cycle:", error);
    return NextResponse.json(
      { error: "Failed to delete cycle" },
      { status: 500 }
    );
  }
}

