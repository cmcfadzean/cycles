import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export async function getOrganization() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Find or create organization for this user
  let organization = await prisma.organization.findUnique({
    where: { clerkUserId: userId },
  });

  if (!organization) {
    // Get user info from Clerk
    const user = await currentUser();
    const name =
      user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}'s Team`
        : user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] + "'s Team" ||
          "My Team";

    organization = await prisma.organization.create({
      data: {
        clerkUserId: userId,
        name,
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

