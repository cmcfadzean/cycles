import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, requireAdmin } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id } = await params;

    const engineer = await prisma.engineer.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        capacities: {
          include: {
            cycle: true,
          },
        },
      },
    });

    if (!engineer) {
      return NextResponse.json(
        { error: "Engineer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(engineer);
  } catch (error) {
    console.error("Failed to fetch engineer:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch engineer" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id } = await params;
    const body = await request.json();

    // Verify engineer exists and belongs to organization
    const existing = await prisma.engineer.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Engineer not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      // Check for duplicate name within organization
      const nameExists = await prisma.engineer.findFirst({
        where: {
          organizationId: organization.id,
          name: body.name.trim(),
          id: { not: id },
        },
      });
      if (nameExists) {
        return NextResponse.json(
          { error: "An engineer with this name already exists" },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.email !== undefined) {
      if (body.email) {
        // Check for duplicate email within organization
        const emailExists = await prisma.engineer.findFirst({
          where: {
            organizationId: organization.id,
            email: body.email,
            id: { not: id },
          },
        });
        if (emailExists) {
          return NextResponse.json(
            { error: "An engineer with this email already exists" },
            { status: 400 }
          );
        }
      }
      updateData.email = body.email || null;
    }

    if (body.active !== undefined) {
      updateData.active = body.active;
    }

    const engineer = await prisma.engineer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(engineer);
  } catch (error) {
    console.error("Failed to update engineer:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update engineer" },
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

    // Check if engineer exists and belongs to organization
    const engineer = await prisma.engineer.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        assignments: true,
      },
    });

    if (!engineer) {
      return NextResponse.json(
        { error: "Engineer not found" },
        { status: 404 }
      );
    }

    // Delete the engineer (cascades to capacities and assignments)
    await prisma.engineer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete engineer:", error);
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete engineer" },
      { status: 500 }
    );
  }
}
