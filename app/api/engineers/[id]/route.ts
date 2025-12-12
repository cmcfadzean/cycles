import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const engineer = await prisma.engineer.findUnique({
      where: { id: params.id },
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
    return NextResponse.json(
      { error: "Failed to fetch engineer" },
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

    // Verify engineer exists
    const existing = await prisma.engineer.findUnique({
      where: { id: params.id },
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
      // Check for duplicate name
      const nameExists = await prisma.engineer.findFirst({
        where: {
          name: body.name.trim(),
          id: { not: params.id },
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
        // Check for duplicate email
        const emailExists = await prisma.engineer.findFirst({
          where: {
            email: body.email,
            id: { not: params.id },
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
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(engineer);
  } catch (error) {
    console.error("Failed to update engineer:", error);
    return NextResponse.json(
      { error: "Failed to update engineer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if engineer exists
    const engineer = await prisma.engineer.findUnique({
      where: { id: params.id },
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
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete engineer:", error);
    return NextResponse.json(
      { error: "Failed to delete engineer" },
      { status: 500 }
    );
  }
}

