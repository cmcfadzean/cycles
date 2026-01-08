import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth";
import { BettingActionRequest } from "@/lib/types";

// Add a pitch to the betting table
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pitchId: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id: cycleId, pitchId } = await params;

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

    // Verify pitch belongs to organization
    const pitch = await prisma.pitch.findFirst({
      where: {
        id: pitchId,
        organizationId: organization.id,
      },
    });

    if (!pitch) {
      return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
    }

    // Add pitch to betting table
    await prisma.pitch.update({
      where: { id: pitchId },
      data: {
        bettingCycleId: cycleId,
        bettingRejected: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to add pitch to betting table:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to add pitch to betting table" },
      { status: 500 }
    );
  }
}

// Perform betting action (approve/reject/remove)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pitchId: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id: cycleId, pitchId } = await params;
    const body: BettingActionRequest = await request.json();

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

    // Verify pitch belongs to organization
    const pitch = await prisma.pitch.findFirst({
      where: {
        id: pitchId,
        organizationId: organization.id,
      },
    });

    if (!pitch) {
      return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
    }

    switch (body.action) {
      case "approve":
        // Add pitch to cycle, clear from betting table, update status to Ready for Dev
        await prisma.pitch.update({
          where: { id: pitchId },
          data: {
            cycleId: cycleId,
            bettingCycleId: null,
            bettingRejected: false,
            status: "READY_FOR_DEV",
          },
        });
        break;

      case "unapprove":
        // Remove pitch from cycle, put back on betting table as pending, reset status to Backlog
        await prisma.$transaction(async (tx) => {
          // Delete assignments for this pitch in this cycle
          await tx.assignment.deleteMany({
            where: {
              cycleId: cycleId,
              pitchId: pitchId,
            },
          });
          
          await tx.pitch.update({
            where: { id: pitchId },
            data: {
              cycleId: null,
              podId: null,
              bettingCycleId: cycleId,
              bettingRejected: false,
              status: "BACKLOG",
            },
          });
        });
        break;

      case "reject":
        // If pitch is in cycle, remove it
        // Mark as rejected in betting table
        await prisma.$transaction(async (tx) => {
          // If the pitch is currently in the cycle, remove it and delete assignments
          if (pitch.cycleId === cycleId) {
            await tx.assignment.deleteMany({
              where: {
                cycleId: cycleId,
                pitchId: pitchId,
              },
            });
          }
          
          await tx.pitch.update({
            where: { id: pitchId },
            data: {
              cycleId: pitch.cycleId === cycleId ? null : pitch.cycleId, // Remove from cycle if it was in this one
              podId: pitch.cycleId === cycleId ? null : pitch.podId, // Clear pod if removed from cycle
              bettingCycleId: cycleId, // Ensure it's on the betting table
              bettingRejected: true,
            },
          });
        });
        break;

      case "unreject":
        // Un-reject: put back to pending state on betting table
        await prisma.pitch.update({
          where: { id: pitchId },
          data: {
            bettingCycleId: cycleId,
            bettingRejected: false,
          },
        });
        break;

      case "remove":
        // Remove from betting table entirely, reset status to Backlog
        await prisma.pitch.update({
          where: { id: pitchId },
          data: {
            bettingCycleId: null,
            bettingRejected: false,
            status: "BACKLOG",
          },
        });
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to perform betting action:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to perform betting action" },
      { status: 500 }
    );
  }
}

