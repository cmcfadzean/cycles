import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";

interface LinearProject {
  id: string;
  name: string;
  description: string | null;
  url: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id: roadmapId } = await params;

    if (!organization.linearApiKeyEncrypted) {
      return NextResponse.json(
        { error: "Linear not connected. Add your API key in Settings." },
        { status: 400 }
      );
    }

    const apiKey = decrypt(organization.linearApiKeyEncrypted);

    // Fetch all projects and filter by roadmap client-side
    // Linear's GraphQL doesn't have a direct filter for projects by roadmap
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
                description
                url
                canceledAt
                completedAt
                roadmaps {
                  nodes {
                    id
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

    const allProjects = data.data?.projects?.nodes || [];
    
    // Filter projects that belong to this roadmap and are not completed/canceled
    const projects: LinearProject[] = allProjects
      .filter((p: { 
        completedAt: string | null; 
        canceledAt: string | null; 
        roadmaps?: { nodes: Array<{ id: string }> } 
      }) => {
        if (p.completedAt || p.canceledAt) return false;
        const projectRoadmaps = p.roadmaps?.nodes || [];
        return projectRoadmaps.some((rm: { id: string }) => rm.id === roadmapId);
      })
      .map((p: { id: string; name: string; description: string | null; url: string }) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        url: p.url,
      }));

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch roadmap projects:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch roadmap projects" },
      { status: 500 }
    );
  }
}
