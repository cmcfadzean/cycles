import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  toNumber,
  CycleDetail,
  EngineerWithCapacity,
  PitchWithAssignments,
  PitchStatus,
  Pod,
} from "@/lib/types";

// This is a PUBLIC endpoint - no authentication required
// Used by the share page to display cycle info to anyone with the link

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cycle = await prisma.cycle.findUnique({
      where: { id },
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
            productManager: true,
            productDesigner: true,
          },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        },
        pods: {
          include: {
            leader: true,
          },
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
        podId: pitch.podId,
        productManagerId: pitch.productManagerId,
        productManagerName: pitch.productManager?.name || null,
        productDesignerId: pitch.productDesignerId,
        productDesignerName: pitch.productDesigner?.name || null,
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

    // Map pods
    const pods: Pod[] = cycle.pods.map((pod) => ({
      id: pod.id,
      name: pod.name,
      leaderId: pod.leaderId,
      leaderName: pod.leader?.name || null,
    }));

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
      pods,
    };

    return NextResponse.json(cycleDetail);
  } catch (error) {
    console.error("Failed to fetch cycle for share:", error);
    return NextResponse.json(
      { error: "Failed to fetch cycle" },
      { status: 500 }
    );
  }
}

