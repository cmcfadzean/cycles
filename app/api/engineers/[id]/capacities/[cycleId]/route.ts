import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, requireAdmin } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cycleId: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id: engineerId, cycleId } = await params;
    const body = await request.json();

    if (body.availableWeeks === undefined) {
      return NextResponse.json(
        { error: "availableWeeks is required" },
        { status: 400 }
      );
    }

    if (body.availableWeeks < 0) {
      return NextResponse.json(
        { error: "availableWeeks cannot be negative" },
        { status: 400 }
      );
    }

    // Verify capacity exists and belongs to org through engineer and cycle
    const existing = await prisma.engineerCycleCapacity.findFirst({
      where: {
        engineerId,
        cycleId,
        engineer: {
          organizationId: organization.id,
        },
        cycle: {
          organizationId: organization.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Capacity not found" },
        { status: 404 }
      );
    }

    const capacity = await prisma.engineerCycleCapacity.update({
      where: {
        engineerId_cycleId: {
          engineerId,
          cycleId,
        },
      },
      data: {
        availableWeeks: body.availableWeeks,
      },
    });

    return NextResponse.json(capacity);
  } catch (error) {
    console.error("Failed to update capacity:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update capacity" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cycleId: string }> }
) {
  try {
    const organization = await requireAdmin();
    const { id: engineerId, cycleId } = await params;

    // Verify capacity exists and belongs to org
    const existing = await prisma.engineerCycleCapacity.findFirst({
      where: {
        engineerId,
        cycleId,
        engineer: {
          organizationId: organization.id,
        },
        cycle: {
          organizationId: organization.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Capacity not found" },
        { status: 404 }
      );
    }

    // Delete assignments for this engineer in this cycle
    await prisma.assignment.deleteMany({
      where: {
        engineerId,
        pitch: {
          cycleId,
        },
      },
    });

    // Delete the capacity
    await prisma.engineerCycleCapacity.delete({
      where: {
        engineerId_cycleId: {
          engineerId,
          cycleId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete capacity:", error);
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete capacity" },
      { status: 500 }
    );
  }
}
