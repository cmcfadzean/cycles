import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth";
import { UpdatePitchRequest, PitchStatus } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id } = await params;
    const body: UpdatePitchRequest = await request.json();

    // Verify pitch exists and belongs to organization
    const existing = await prisma.pitch.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.pitchDocUrl !== undefined) updateData.pitchDocUrl = body.pitchDocUrl;
    if (body.estimateWeeks !== undefined) {
      if (body.estimateWeeks <= 0) {
        return NextResponse.json(
          { error: "estimateWeeks must be greater than 0" },
          { status: 400 }
        );
      }
      updateData.estimateWeeks = body.estimateWeeks;
    }
    if (body.status !== undefined) {
      const validStatuses: PitchStatus[] = ["PLANNED", "IN_PROGRESS", "DONE", "DROPPED"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid status value" },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.podId !== undefined) updateData.podId = body.podId || null;
    if (body.productManagerId !== undefined) updateData.productManagerId = body.productManagerId || null;
    if (body.productDesignerId !== undefined) updateData.productDesignerId = body.productDesignerId || null;
    
    // Handle cycleId changes
    if (body.cycleId !== undefined) {
      const newCycleId = body.cycleId || null;
      
      // If removing from cycle, clear pod and delete assignments
      if (newCycleId === null && existing.cycleId !== null) {
        updateData.podId = null;
        // Delete all assignments for this pitch
        await prisma.assignment.deleteMany({
          where: { pitchId: id },
        });
      }
      
      // If assigning to a new cycle, verify cycle exists and belongs to org
      if (newCycleId !== null) {
        const cycle = await prisma.cycle.findFirst({
          where: {
            id: newCycleId,
            organizationId: organization.id,
          },
        });
        if (!cycle) {
          return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
        }
        // Clear pod when moving to different cycle
        if (existing.cycleId !== newCycleId) {
          updateData.podId = null;
          // Delete assignments from old cycle
          await prisma.assignment.deleteMany({
            where: { pitchId: id },
          });
        }
      }
      
      updateData.cycleId = newCycleId;
    }

    const pitch = await prisma.pitch.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(pitch);
  } catch (error) {
    console.error("Failed to update pitch:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update pitch" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id } = await params;

    // Verify pitch belongs to organization
    const existing = await prisma.pitch.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
    }

    await prisma.pitch.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete pitch:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete pitch" },
      { status: 500 }
    );
  }
}
