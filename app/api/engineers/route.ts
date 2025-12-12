import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateEngineerRequest } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const engineers = await prisma.engineer.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(engineers);
  } catch (error) {
    console.error("Failed to fetch engineers:", error);
    return NextResponse.json(
      { error: "Failed to fetch engineers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateEngineerRequest = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingName = await prisma.engineer.findUnique({
      where: { name: body.name.trim() },
    });
    if (existingName) {
      return NextResponse.json(
        { error: "An engineer with this name already exists" },
        { status: 400 }
      );
    }

    // Check for duplicate email if provided
    if (body.email) {
      const existingEmail = await prisma.engineer.findUnique({
        where: { email: body.email },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: "An engineer with this email already exists" },
          { status: 400 }
        );
      }
    }

    const engineer = await prisma.engineer.create({
      data: {
        name: body.name.trim(),
        email: body.email || null,
      },
    });

    return NextResponse.json(engineer, { status: 201 });
  } catch (error) {
    console.error("Failed to create engineer:", error);
    return NextResponse.json(
      { error: "Failed to create engineer" },
      { status: 500 }
    );
  }
}

