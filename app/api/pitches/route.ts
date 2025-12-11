import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreatePitchRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: CreatePitchRequest = await request.json();

    if (!body.cycleId || !body.title || body.estimateWeeks === undefined) {
      return NextResponse.json(
        { error: "cycleId, title, and estimateWeeks are required" },
        { status: 400 }
      );
    }

    if (body.estimateWeeks <= 0) {
      return NextResponse.json(
        { error: "estimateWeeks must be greater than 0" },
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

    const pitch = await prisma.pitch.create({
      data: {
        cycleId: body.cycleId,
        title: body.title,
        pitchDocUrl: body.pitchDocUrl || null,
        estimateWeeks: body.estimateWeeks,
        priority: body.priority ?? null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(pitch, { status: 201 });
  } catch (error) {
    console.error("Failed to create pitch:", error);
    return NextResponse.json(
      { error: "Failed to create pitch" },
      { status: 500 }
    );
  }
}

