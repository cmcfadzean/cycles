import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, requireAdmin } from "@/lib/auth";
import {
  toNumber,
  CycleDetail,
  EngineerWithCapacity,
  PitchWithAssignments,
  PitchStatus,
  Pod,
  BettingPitch,
} from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id } = await params;

    const cycle = await prisma.cycle.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
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
        bettingPitches: {
          orderBy: [{ bettingRejected: "asc" }, { createdAt: "asc" }],
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

    // Build betting pitches list
    // Include: pitches on betting table + pitches already in cycle (as approved)
    const approvedPitchIds = new Set(cycle.pitches.map((p) => p.id));
    
    const bettingPitches: BettingPitch[] = [
      // Pitches already in the cycle (approved)
      ...cycle.pitches.map((pitch) => ({
        id: pitch.id,
        title: pitch.title,
        pitchDocUrl: pitch.pitchDocUrl,
        estimateWeeks: toNumber(pitch.estimateWeeks),
        isApproved: true,
        isRejected: false,
      })),
      // Pitches on the betting table (not yet approved)
      ...cycle.bettingPitches
        .filter((p) => !approvedPitchIds.has(p.id)) // Exclude if somehow also in cycle
        .map((pitch) => ({
          id: pitch.id,
          title: pitch.title,
          pitchDocUrl: pitch.pitchDocUrl,
          estimateWeeks: toNumber(pitch.estimateWeeks),
          isApproved: false,
          isRejected: pitch.bettingRejected,
        })),
    ].sort((a, b) => {
      // Sort: approved first, then pending, then rejected at bottom
      if (a.isApproved !== b.isApproved) return a.isApproved ? -1 : 1;
      if (a.isRejected !== b.isRejected) return a.isRejected ? 1 : -1;
      return 0;
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
      pods,
      bettingPitches,
    };

    return NextResponse.json(cycleDetail);
  } catch (error) {
    console.error("Failed to fetch cycle:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch cycle" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id } = await params;
    const body = await request.json();

    // Verify cycle belongs to organization
    const existing = await prisma.cycle.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.startDate !== undefined)
      updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate);
    if (body.description !== undefined) updateData.description = body.description;

    const cycle = await prisma.cycle.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(cycle);
  } catch (error) {
    console.error("Failed to update cycle:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update cycle" },
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

    // Verify cycle belongs to organization
    const existing = await prisma.cycle.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    await prisma.cycle.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete cycle:", error);
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete cycle" },
      { status: 500 }
    );
  }
}
