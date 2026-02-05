import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth";

// Bulk reorder pods
export async function PATCH(request: NextRequest) {
  try {
    const organization = await requireOrganization();
    const body = await request.json();

    if (!body.podIds || !Array.isArray(body.podIds) || !body.cycleId) {
      return NextResponse.json(
        { error: "podIds array and cycleId are required" },
        { status: 400 }
      );
    }

    // Verify cycle belongs to organization
    const cycle = await prisma.cycle.findFirst({
      where: {
        id: body.cycleId,
        organizationId: organization.id,
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // Update sortOrder for each pod
    await Promise.all(
      body.podIds.map((podId: string, index: number) =>
        prisma.pod.update({
          where: { id: podId },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder pods:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to reorder pods" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const organization = await requireOrganization();
    const body = await request.json();

    if (!body.name || !body.cycleId) {
      return NextResponse.json(
        { error: "name and cycleId are required" },
        { status: 400 }
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

    // If leaderId provided, verify engineer exists and belongs to org
    if (body.leaderId) {
      const engineer = await prisma.engineer.findFirst({
        where: {
          id: body.leaderId,
          organizationId: organization.id,
        },
      });
      if (!engineer) {
        return NextResponse.json(
          { error: "Leader engineer not found" },
          { status: 404 }
        );
      }
    }

    // Get max sortOrder for this cycle
    const maxSortOrder = await prisma.pod.aggregate({
      where: { cycleId: body.cycleId },
      _max: { sortOrder: true },
    });

    const pod = await prisma.pod.create({
      data: {
        name: body.name,
        cycleId: body.cycleId,
        leaderId: body.leaderId || null,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      },
      include: {
        leader: true,
      },
    });

    return NextResponse.json(pod, { status: 201 });
  } catch (error) {
    console.error("Failed to create pod:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create pod" },
      { status: 500 }
    );
  }
}
