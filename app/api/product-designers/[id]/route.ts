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

    const productDesigner = await prisma.productDesigner.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        pitches: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!productDesigner) {
      return NextResponse.json(
        { error: "Product designer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(productDesigner);
  } catch (error) {
    console.error("Failed to fetch product designer:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch product designer" },
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

    const existing = await prisma.productDesigner.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Product designer not found" },
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
      const nameExists = await prisma.productDesigner.findFirst({
        where: {
          organizationId: organization.id,
          name: body.name.trim(),
          id: { not: id },
        },
      });
      if (nameExists) {
        return NextResponse.json(
          { error: "A product designer with this name already exists" },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.email !== undefined) {
      if (body.email) {
        // Check for duplicate email within organization
        const emailExists = await prisma.productDesigner.findFirst({
          where: {
            organizationId: organization.id,
            email: body.email.trim(),
            id: { not: id },
          },
        });
        if (emailExists) {
          return NextResponse.json(
            { error: "A product designer with this email already exists" },
            { status: 400 }
          );
        }
        updateData.email = body.email.trim();
      } else {
        updateData.email = null;
      }
    }

    if (body.active !== undefined) {
      updateData.active = body.active;
    }

    const productDesigner = await prisma.productDesigner.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(productDesigner);
  } catch (error) {
    console.error("Failed to update product designer:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update product designer" },
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

    // Verify designer belongs to organization
    const existing = await prisma.productDesigner.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Product designer not found" },
        { status: 404 }
      );
    }

    // Clear productDesignerId from associated pitches first
    await prisma.pitch.updateMany({
      where: { productDesignerId: id },
      data: { productDesignerId: null },
    });

    await prisma.productDesigner.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product designer:", error);
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete product designer" },
      { status: 500 }
    );
  }
}
