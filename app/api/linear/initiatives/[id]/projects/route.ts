import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";

interface LinearProject {
  id: string;
  name: string;
  description: string | null;
  url: string;
}

interface LinearProjectNode {
  id: string;
  name: string;
  description: string | null;
  url: string;
  canceledAt: string | null;
  completedAt: string | null;
}

interface LinearResponse {
  data?: {
    initiative?: {
      projects: {
        nodes: LinearProjectNode[];
      };
    };
  };
  errors?: Array<{ message: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await requireOrganization();
    const { id: initiativeId } = await params;

    if (!organization.linearApiKeyEncrypted) {
      return NextResponse.json(
        { error: "Linear not connected. Add your API key in Settings." },
        { status: 400 }
      );
    }

    const apiKey = decrypt(organization.linearApiKeyEncrypted);

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: `
          query {
            initiative(id: "${initiativeId}") {
              projects {
                nodes {
                  id
                  name
                  description
                  url
                  canceledAt
                  completedAt
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

    const data: LinearResponse = await response.json();

    if (data.errors) {
      console.error("Linear GraphQL errors:", data.errors);
      return NextResponse.json(
        { error: "Linear API error: " + data.errors[0]?.message },
        { status: 500 }
      );
    }

    const allProjects = data.data?.initiative?.projects?.nodes || [];
    
    // Filter out completed and canceled projects
    const projects: LinearProject[] = allProjects
      .filter((p) => !p.completedAt && !p.canceledAt)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        url: p.url,
      }));

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch initiative projects:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch initiative projects" },
      { status: 500 }
    );
  }
}

