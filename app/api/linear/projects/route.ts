import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";

interface LinearProject {
  id: string;
  name: string;
  description: string | null;
  url: string;
  initiativePath: string | null;
}

interface LinearProjectNode {
  id: string;
  name: string;
  description: string | null;
  url: string;
  state: string;
  canceledAt: string | null;
  completedAt: string | null;
}

interface LinearResponse {
  data?: {
    projects: {
      nodes: LinearProjectNode[];
    };
  };
  errors?: Array<{ message: string }>;
}

export async function GET() {
  try {
    const organization = await requireOrganization();

    if (!organization.linearApiKeyEncrypted) {
      return NextResponse.json(
        { error: "Linear not connected. Add your API key in Settings." },
        { status: 400 }
      );
    }

    // Decrypt the API key
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
            projects(first: 250) {
              nodes {
                id
                name
                description
                url
                state
                canceledAt
                completedAt
              }
            }
          }
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Linear API error:", response.status, response.statusText, errorText);
      return NextResponse.json(
        { error: `Linear API error: ${response.status} ${response.statusText}` },
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

    // Filter out completed and canceled projects client-side
    const allProjects = data.data?.projects.nodes || [];
    const projects: LinearProject[] = allProjects
      .filter((p) => !p.completedAt && !p.canceledAt)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        url: p.url,
        initiativePath: null, // TODO: Add initiative support once we figure out correct API schema
      }));

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch Linear projects:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch Linear projects" },
      { status: 500 }
    );
  }
}

