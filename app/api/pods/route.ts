import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.cycleId) {
      return NextResponse.json(
        { error: "name and cycleId are required" },
        { status: 400 }
      );
    }

    // Verify cycle exists
    const cycle = await prisma.cycle.findUnique({
      where: { id: body.cycleId },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // If leaderId provided, verify engineer exists
    if (body.leaderId) {
      const engineer = await prisma.engineer.findUnique({
        where: { id: body.leaderId },
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
    return NextResponse.json(
      { error: "Failed to create pod" },
      { status: 500 }
    );
  }
}




