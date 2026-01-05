import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth";
import { SetCapacityRequest } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id: engineerId } = await params;
    const body: SetCapacityRequest = await request.json();

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

    // Verify engineer exists and belongs to organization
    const engineer = await prisma.engineer.findFirst({
      where: {
        id: engineerId,
        organizationId: organization.id,
      },
    });

    if (!engineer) {
      return NextResponse.json(
        { error: "Engineer not found" },
        { status: 404 }
      );
    }

    // Verify cycle exists and belongs to organization
    const cycle = await prisma.cycle.findFirst({
      where: {
        id: body.cycleId,
        organizationId: organization.id,
      },
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
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to set capacity" },
      { status: 500 }
    );
  }
}
