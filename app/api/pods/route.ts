import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth";

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

    const pod = await prisma.pod.create({
      data: {
        name: body.name,
        cycleId: body.cycleId,
        leaderId: body.leaderId || null,
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
