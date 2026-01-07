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

interface LinearInitiativeNode {
  id: string;
  name: string;
  description: string | null;
  parent?: { id: string } | null;
  children: {
    nodes: Array<{ id: string }>;
  };
  projects: {
    nodes: Array<{ id: string }>;
  };
}

interface LinearResponse {
  data?: {
    initiatives: {
      nodes: LinearInitiativeNode[];
    };
  };
  errors?: Array<{ message: string }>;
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

    // Check for parentId query param to get child initiatives
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");

    const apiKey = decrypt(organization.linearApiKeyEncrypted);

    // Build the query based on whether we're getting root initiatives or children
    const query = parentId
      ? `
          query {
            initiative(id: "${parentId}") {
              children {
                nodes {
                  id
                  name
                  description
                  children {
                    nodes {
                      id
                    }
                  }
                  projects {
                    nodes {
                      id
                    }
                  }
                }
              }
            }
          }
        `
      : `
          query {
            initiatives(first: 100) {
              nodes {
                id
                name
                description
                parent {
                  id
                }
                children {
                  nodes {
                    id
                  }
                }
                projects {
                  nodes {
                    id
                  }
                }
              }
            }
          }
        `;

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query }),
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

    // Extract nodes based on query type
    let nodes: LinearInitiativeNode[] = [];
    if (parentId) {
      nodes = data.data?.initiative?.children?.nodes || [];
    } else {
      // For root initiatives, filter to only show top-level ones (those without parents)
      const allNodes = data.data?.initiatives?.nodes || [];
      nodes = allNodes.filter((node: LinearInitiativeNode) => !node.parent);
    }

    const initiatives: LinearInitiative[] = nodes.map((node) => ({
      id: node.id,
      name: node.name,
      description: node.description,
      hasChildren: (node.children?.nodes?.length || 0) > 0,
      hasProjects: (node.projects?.nodes?.length || 0) > 0,
    }));

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

