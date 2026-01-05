import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const productDesigners = await prisma.productDesigner.findMany({
      include: {
        _count: {
          select: { pitches: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(productDesigners);
  } catch (error) {
    console.error("Failed to fetch product designers:", error);
    return NextResponse.json(
      { error: "Failed to fetch product designers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingName = await prisma.productDesigner.findUnique({
      where: { name: body.name.trim() },
    });

    if (existingName) {
      return NextResponse.json(
        { error: "A product designer with this name already exists" },
        { status: 400 }
      );
    }

    // Check for duplicate email if provided
    if (body.email) {
      const existingEmail = await prisma.productDesigner.findUnique({
        where: { email: body.email.trim() },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: "A product designer with this email already exists" },
          { status: 400 }
        );
      }
    }

    const productDesigner = await prisma.productDesigner.create({
      data: {
        name: body.name.trim(),
        email: body.email?.trim() || null,
      },
    });

    return NextResponse.json(productDesigner, { status: 201 });
  } catch (error) {
    console.error("Failed to create product designer:", error);
    return NextResponse.json(
      { error: "Failed to create product designer" },
      { status: 500 }
    );
  }
}

