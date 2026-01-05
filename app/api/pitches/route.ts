import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const organization = await requireOrganization();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // "available" or "funded"

    const where: Record<string, unknown> = {
      organizationId: organization.id,
    };
    
    if (status === "available") {
      where.cycleId = null;
    } else if (status === "funded") {
      where.cycleId = { not: null };
    }

    const pitches = await prisma.pitch.findMany({
      where,
      include: {
        cycle: {
          select: {
            id: true,
            name: true,
          },
        },
        productManager: {
          select: {
            id: true,
            name: true,
          },
        },
        productDesigner: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          include: {
            engineer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json(pitches);
  } catch (error) {
    console.error("Failed to fetch pitches:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch pitches" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const organization = await requireOrganization();
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    // If cycleId is provided, verify cycle exists and belongs to org
    if (body.cycleId) {
      const cycle = await prisma.cycle.findFirst({
        where: {
          id: body.cycleId,
          organizationId: organization.id,
        },
      });

      if (!cycle) {
        return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
      }
    }

    const pitch = await prisma.pitch.create({
      data: {
        organizationId: organization.id,
        cycleId: body.cycleId || null,
        productManagerId: body.productManagerId || null,
        productDesignerId: body.productDesignerId || null,
        title: body.title,
        pitchDocUrl: body.pitchDocUrl || null,
        estimateWeeks: body.estimateWeeks || 0,
        priority: body.priority ?? null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(pitch, { status: 201 });
  } catch (error) {
    console.error("Failed to create pitch:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create pitch" },
      { status: 500 }
    );
  }
}
