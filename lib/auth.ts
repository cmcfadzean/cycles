import { auth } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export type OrganizationWithRole = {
  id: string;
  clerkOrganizationId: string;
  name: string;
  linearApiKeyEncrypted: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: string | null;
  isAdmin: boolean;
};

export async function getOrganization(): Promise<OrganizationWithRole | null> {
  const { userId, orgId, orgSlug, orgRole } = await auth();

  if (!userId) {
    return null;
  }

  // Require a Clerk organization to be selected
  if (!orgId) {
    return null;
  }

  // Find or create organization for this Clerk org
  let organization = await prisma.organization.findUnique({
    where: { clerkOrganizationId: orgId },
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        clerkOrganizationId: orgId,
        name: orgSlug || "Team",
      },
    });
  }

  return {
    ...organization,
    role: orgRole || null,
    isAdmin: orgRole === "org:admin",
  };
}

export async function requireOrganization(): Promise<OrganizationWithRole> {
  const organization = await getOrganization();

  if (!organization) {
    throw new Error("Unauthorized");
  }

  return organization;
}

export async function requireAdmin(): Promise<OrganizationWithRole> {
  const organization = await getOrganization();

  if (!organization) {
    throw new Error("Unauthorized");
  }

  if (!organization.isAdmin) {
    throw new Error("Admin access required");
  }

  return organization;
}
