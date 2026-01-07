import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encryption";

// GET - Check if Linear is connected
export async function GET() {
  try {
    const organization = await requireOrganization();

    return NextResponse.json({
      connected: !!organization.linearApiKeyEncrypted,
    });
  } catch (error) {
    console.error("Failed to check Linear connection:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to check Linear connection" },
      { status: 500 }
    );
  }
}

// POST - Save Linear API key
export async function POST(request: NextRequest) {
  try {
    const organization = await requireOrganization();
    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    // Validate the API key by making a test request to Linear
    const testResponse = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: `query { viewer { id name } }`,
      }),
    });

    if (!testResponse.ok) {
      return NextResponse.json(
        { error: "Invalid API key - could not connect to Linear" },
        { status: 400 }
      );
    }

    const testData = await testResponse.json();
    if (testData.errors) {
      return NextResponse.json(
        { error: "Invalid API key - authentication failed" },
        { status: 400 }
      );
    }

    // Encrypt and save the API key
    const encryptedKey = encrypt(apiKey);

    await prisma.organization.update({
      where: { id: organization.id },
      data: { linearApiKeyEncrypted: encryptedKey },
    });

    return NextResponse.json({
      success: true,
      message: "Linear connected successfully",
    });
  } catch (error) {
    console.error("Failed to save Linear API key:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to save Linear API key" },
      { status: 500 }
    );
  }
}

// DELETE - Remove Linear API key
export async function DELETE() {
  try {
    const organization = await requireOrganization();

    await prisma.organization.update({
      where: { id: organization.id },
      data: { linearApiKeyEncrypted: null },
    });

    return NextResponse.json({
      success: true,
      message: "Linear disconnected",
    });
  } catch (error) {
    console.error("Failed to remove Linear API key:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to remove Linear API key" },
      { status: 500 }
    );
  }
}

