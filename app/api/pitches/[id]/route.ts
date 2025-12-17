import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdatePitchRequest, PitchStatus } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdatePitchRequest = await request.json();

    // Verify pitch exists
    const existing = await prisma.pitch.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.pitchDocUrl !== undefined) updateData.pitchDocUrl = body.pitchDocUrl;
    if (body.estimateWeeks !== undefined) {
      if (body.estimateWeeks <= 0) {
        return NextResponse.json(
          { error: "estimateWeeks must be greater than 0" },
          { status: 400 }
        );
      }
      updateData.estimateWeeks = body.estimateWeeks;
    }
    if (body.status !== undefined) {
      const validStatuses: PitchStatus[] = ["PLANNED", "IN_PROGRESS", "DONE", "DROPPED"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid status value" },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.podId !== undefined) updateData.podId = body.podId || null;

    const pitch = await prisma.pitch.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(pitch);
  } catch (error) {
    console.error("Failed to update pitch:", error);
    return NextResponse.json(
      { error: "Failed to update pitch" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.pitch.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete pitch:", error);
    return NextResponse.json(
      { error: "Failed to delete pitch" },
      { status: 500 }
    );
  }
}

