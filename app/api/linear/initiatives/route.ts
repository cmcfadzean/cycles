import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";

interface LinearInitiative {
  id: string;
  name: string;
  description: string | null;
  hasChildren: boolean;
  hasProjects: boolean;
}

export async function GET(request: Request) {
  try {
    const organization = await requireOrganization();

    if (!organization.linearApiKeyEncrypted) {
      return NextResponse.json(
        { error: "Linear not connected. Add your API key in Settings." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");
    const apiKey = decrypt(organization.linearApiKeyEncrypted);

    // For now, we'll use projects grouped by roadmap as our "initiatives"
    // since Linear's roadmap API structure varies
    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: `
          query {
            projects(first: 100) {
              nodes {
                id
                name
                roadmaps {
                  nodes {
                    id
                    name
                  }
                }
              }
            }
          }
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Linear API error:", response.status, errorText);
      return NextResponse.json(
        { error: `Linear API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (data.errors) {
      console.error("Linear GraphQL errors:", data.errors);
      return NextResponse.json(
        { error: "Linear API error: " + data.errors[0]?.message },
        { status: 500 }
      );
    }

    // Extract unique roadmaps from projects
    const projects = data.data?.projects?.nodes || [];
    const roadmapMap = new Map<string, { id: string; name: string; projectCount: number }>();
    
    for (const project of projects) {
      const roadmaps = project.roadmaps?.nodes || [];
      for (const roadmap of roadmaps) {
        if (!roadmapMap.has(roadmap.id)) {
          roadmapMap.set(roadmap.id, {
            id: roadmap.id,
            name: roadmap.name,
            projectCount: 1,
          });
        } else {
          roadmapMap.get(roadmap.id)!.projectCount++;
        }
      }
    }

    // If parentId is provided, return empty (we'll handle this in projects route)
    if (parentId) {
      return NextResponse.json([]);
    }

    // Convert to initiatives array
    const initiatives: LinearInitiative[] = Array.from(roadmapMap.values()).map((rm) => ({
      id: rm.id,
      name: rm.name,
      description: `${rm.projectCount} project${rm.projectCount !== 1 ? 's' : ''}`,
      hasChildren: false,
      hasProjects: true,
    }));

    // Sort by name
    initiatives.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(initiatives);
  } catch (error) {
    console.error("Failed to fetch Linear initiatives:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch Linear initiatives" },
      { status: 500 }
    );
  }
}
