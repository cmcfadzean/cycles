import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth";
import { toNumber, CycleSummary, CreateCycleRequest } from "@/lib/types";

export async function GET() {
  try {
    const organization = await requireOrganization();

    const cycles = await prisma.cycle.findMany({
      where: {
        organizationId: organization.id,
      },
      include: {
        pitches: {
          select: {
            estimateWeeks: true,
          },
        },
        capacities: {
          select: {
            availableWeeks: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    const summaries: CycleSummary[] = cycles.map((cycle) => {
      const totalAvailableWeeks = cycle.capacities.reduce(
        (sum, cap) => sum + toNumber(cap.availableWeeks),
        0
      );
      const totalRequiredWeeks = cycle.pitches.reduce(
        (sum, pitch) => sum + toNumber(pitch.estimateWeeks),
        0
      );

      return {
        id: cycle.id,
        name: cycle.name,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        description: cycle.description,
        pitchCount: cycle.pitches.length,
        totalAvailableWeeks,
        totalRequiredWeeks,
        surplusOrDeficit: totalAvailableWeeks - totalRequiredWeeks,
      };
    });

    return NextResponse.json(summaries);
  } catch (error) {
    console.error("Failed to fetch cycles:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch cycles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const organization = await requireOrganization();
    const body: CreateCycleRequest = await request.json();

    if (!body.name || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "Name, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const cycle = await prisma.cycle.create({
      data: {
        organizationId: organization.id,
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        description: body.description,
      },
    });

    return NextResponse.json(cycle, { status: 201 });
  } catch (error) {
    console.error("Failed to create cycle:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create cycle" },
      { status: 500 }
    );
  }
}
