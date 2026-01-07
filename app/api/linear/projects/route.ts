import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";

interface LinearProject {
  id: string;
  name: string;
  description: string | null;
  url: string;
  state: string;
}

interface LinearResponse {
  data?: {
    projects: {
      nodes: Array<{
        id: string;
        name: string;
        description: string | null;
        url: string;
        state: string;
      }>;
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
            projects(
              first: 100
              filter: { 
                state: { type: { nin: ["completed", "canceled"] } }
              }
              orderBy: updatedAt
            ) {
              nodes {
                id
                name
                description
                url
                state
              }
            }
          }
        `,
      }),
    });

    if (!response.ok) {
      console.error("Linear API error:", response.status, response.statusText);
      return NextResponse.json(
        { error: "Failed to fetch from Linear" },
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

    const projects: LinearProject[] = data.data?.projects.nodes || [];

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

