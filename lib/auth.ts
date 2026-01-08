import { auth } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export async function getOrganization() {
  const { userId, orgId, orgSlug } = await auth();

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

  return organization;
}

export async function requireOrganization() {
  const organization = await getOrganization();

  if (!organization) {
    throw new Error("Unauthorized");
  }

  return organization;
}
