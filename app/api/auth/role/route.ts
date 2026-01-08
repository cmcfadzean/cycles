import { NextResponse } from "next/server";
import { getOrganization } from "@/lib/auth";

export async function GET() {
  try {
    const organization = await getOrganization();

    if (!organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      role: organization.role,
      isAdmin: organization.isAdmin,
    });
  } catch (error) {
    console.error("Failed to get role:", error);
    return NextResponse.json(
      { error: "Failed to get role" },
      { status: 500 }
    );
  }
}

