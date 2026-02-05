import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, requireAdmin } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id } = await params;
    const body = await request.json();

    // Verify pod exists and belongs to org through cycle
    const existing = await prisma.pod.findFirst({
      where: {
        id,
        cycle: {
          organizationId: organization.id,
        },
      },
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
      updateData.leaderId = body.leaderId || null;
    }

    if (body.sortOrder !== undefined) {
      updateData.sortOrder = body.sortOrder;
    }

    const pod = await prisma.pod.update({
      where: { id },
      data: updateData,
      include: {
        leader: true,
      },
    });

    return NextResponse.json(pod);
  } catch (error) {
    console.error("Failed to update pod:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update pod" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireAdmin();
    const { id } = await params;

    // Verify pod exists and belongs to org through cycle
    const existing = await prisma.pod.findFirst({
      where: {
        id,
        cycle: {
          organizationId: organization.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pod not found" }, { status: 404 });
    }

    // Remove pod from all pitches first (set podId to null)
    await prisma.pitch.updateMany({
      where: { podId: id },
      data: { podId: null },
    });

    // Delete the pod
    await prisma.pod.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete pod:", error);
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete pod" },
      { status: 500 }
    );
  }
}
