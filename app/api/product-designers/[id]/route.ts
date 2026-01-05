import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productDesigner = await prisma.productDesigner.findUnique({
      where: { id: params.id },
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
    return NextResponse.json(
      { error: "Failed to fetch product designer" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const existing = await prisma.productDesigner.findUnique({
      where: { id: params.id },
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
      // Check for duplicate name
      const nameExists = await prisma.productDesigner.findFirst({
        where: {
          name: body.name.trim(),
          id: { not: params.id },
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
        // Check for duplicate email
        const emailExists = await prisma.productDesigner.findFirst({
          where: {
            email: body.email.trim(),
            id: { not: params.id },
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
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(productDesigner);
  } catch (error) {
    console.error("Failed to update product designer:", error);
    return NextResponse.json(
      { error: "Failed to update product designer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Clear productDesignerId from associated pitches first
    await prisma.pitch.updateMany({
      where: { productDesignerId: params.id },
      data: { productDesignerId: null },
    });

    await prisma.productDesigner.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product designer:", error);
    return NextResponse.json(
      { error: "Failed to delete product designer" },
      { status: 500 }
    );
  }
}

