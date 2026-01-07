import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";

interface LinearInitiative {
  id: string;
  name: string;
  parent?: LinearInitiative | null;
}

interface LinearProject {
  id: string;
  name: string;
  description: string | null;
  url: string;
  initiativePath: string | null; // e.g., "Parent Initiative > Child Initiative"
}

interface LinearProjectNode {
  id: string;
  name: string;
  description: string | null;
  url: string;
  state: string;
  canceledAt: string | null;
  completedAt: string | null;
  initiatives: {
    nodes: Array<{
      id: string;
      name: string;
      parent?: {
        id: string;
        name: string;
        parent?: {
          id: string;
          name: string;
          parent?: {
            id: string;
            name: string;
          } | null;
        } | null;
      } | null;
    }>;
  };
}

interface LinearResponse {
  data?: {
    projects: {
      nodes: LinearProjectNode[];
    };
  };
  errors?: Array<{ message: string }>;
}

// Build initiative path from nested structure
function buildInitiativePath(initiative: LinearProjectNode["initiatives"]["nodes"][0]): string {
  const parts: string[] = [];
  
  // Build path from top-level parent down
  if (initiative.parent?.parent?.parent) {
    parts.push(initiative.parent.parent.parent.name);
  }
  if (initiative.parent?.parent) {
    parts.push(initiative.parent.parent.name);
  }
  if (initiative.parent) {
    parts.push(initiative.parent.name);
  }
  parts.push(initiative.name);
  
  return parts.join(" → ");
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
            projects(first: 100) {
              nodes {
                id
                name
                description
                url
                state
                canceledAt
                completedAt
                initiatives {
                  nodes {
                    id
                    name
                    parent {
                      id
                      name
                      parent {
                        id
                        name
                        parent {
                          id
                          name
                        }
                      }
                    }
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
      .map((p) => {
        // Get the first initiative's path (projects can have multiple initiatives)
        const firstInitiative = p.initiatives?.nodes?.[0];
        const initiativePath = firstInitiative ? buildInitiativePath(firstInitiative) : null;
        
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          url: p.url,
          initiativePath,
        };
      });

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

