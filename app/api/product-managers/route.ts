import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const productManagers = await prisma.productManager.findMany({
      include: {
        _count: {
          select: { pitches: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(productManagers);
  } catch (error) {
    console.error("Failed to fetch product managers:", error);
    return NextResponse.json(
      { error: "Failed to fetch product managers" },
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
    const existingName = await prisma.productManager.findUnique({
      where: { name: body.name.trim() },
    });

    if (existingName) {
      return NextResponse.json(
        { error: "A product manager with this name already exists" },
        { status: 400 }
      );
    }

    // Check for duplicate email if provided
    if (body.email) {
      const existingEmail = await prisma.productManager.findUnique({
        where: { email: body.email.trim() },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: "A product manager with this email already exists" },
          { status: 400 }
        );
      }
    }

    const productManager = await prisma.productManager.create({
      data: {
        name: body.name.trim(),
        email: body.email?.trim() || null,
      },
    });

    return NextResponse.json(productManager, { status: 201 });
  } catch (error) {
    console.error("Failed to create product manager:", error);
    return NextResponse.json(
      { error: "Failed to create product manager" },
      { status: 500 }
    );
  }
}

