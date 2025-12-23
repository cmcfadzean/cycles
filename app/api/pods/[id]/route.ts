import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Verify pod exists
    const existing = await prisma.pod.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pod not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      updateData.name = body.name;
    }

    if (body.leaderId !== undefined) {
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
      updateData.leaderId = body.leaderId || null;
    }

    const pod = await prisma.pod.update({
      where: { id: params.id },
      data: updateData,
      include: {
        leader: true,
      },
    });

    return NextResponse.json(pod);
  } catch (error) {
    console.error("Failed to update pod:", error);
    return NextResponse.json(
      { error: "Failed to update pod" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify pod exists
    const existing = await prisma.pod.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pod not found" }, { status: 404 });
    }

    // Remove pod from all pitches first (set podId to null)
    await prisma.pitch.updateMany({
      where: { podId: params.id },
      data: { podId: null },
    });

    // Delete the pod
    await prisma.pod.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete pod:", error);
    return NextResponse.json(
      { error: "Failed to delete pod" },
      { status: 500 }
    );
  }
}




