import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SetCapacityRequest } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: SetCapacityRequest = await request.json();
    const engineerId = params.id;

    if (!body.cycleId || body.availableWeeks === undefined) {
      return NextResponse.json(
        { error: "cycleId and availableWeeks are required" },
        { status: 400 }
      );
    }

    if (body.availableWeeks < 0) {
      return NextResponse.json(
        { error: "availableWeeks cannot be negative" },
        { status: 400 }
      );
    }

    // Verify engineer exists
    const engineer = await prisma.engineer.findUnique({
      where: { id: engineerId },
    });

    if (!engineer) {
      return NextResponse.json(
        { error: "Engineer not found" },
        { status: 404 }
      );
    }

    // Verify cycle exists
    const cycle = await prisma.cycle.findUnique({
      where: { id: body.cycleId },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // Upsert capacity
    const capacity = await prisma.engineerCycleCapacity.upsert({
      where: {
        engineerId_cycleId: {
          engineerId,
          cycleId: body.cycleId,
        },
      },
      update: {
        availableWeeks: body.availableWeeks,
      },
      create: {
        engineerId,
        cycleId: body.cycleId,
        availableWeeks: body.availableWeeks,
      },
    });

    return NextResponse.json(capacity, { status: 201 });
  } catch (error) {
    console.error("Failed to set capacity:", error);
    return NextResponse.json(
      { error: "Failed to set capacity" },
      { status: 500 }
    );
  }
}




