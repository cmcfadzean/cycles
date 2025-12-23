import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; cycleId: string } }
) {
  try {
    const body = await request.json();
    const { id: engineerId, cycleId } = params;

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

    // Verify capacity exists
    const existing = await prisma.engineerCycleCapacity.findUnique({
      where: {
        engineerId_cycleId: {
          engineerId,
          cycleId,
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
    return NextResponse.json(
      { error: "Failed to update capacity" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; cycleId: string } }
) {
  try {
    const { id: engineerId, cycleId } = params;

    // Verify capacity exists
    const existing = await prisma.engineerCycleCapacity.findUnique({
      where: {
        engineerId_cycleId: {
          engineerId,
          cycleId,
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
    return NextResponse.json(
      { error: "Failed to delete capacity" },
      { status: 500 }
    );
  }
}




