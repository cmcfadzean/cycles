import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Update this with your Clerk Organization ID from the Clerk dashboard
// Find it at: Clerk Dashboard > Organizations > Your Org > Settings
const CLERK_ORG_ID = "org_XXXXXXXXXX"; // Replace with your actual org ID
const ORGANIZATION_NAME = "My Team";

async function main() {
  console.log("Starting migration to Clerk Organizations...\n");

  // Check if we have an existing organization (from old user-based setup)
  const existingOrg = await prisma.organization.findFirst();

  if (existingOrg) {
    console.log(`Found existing organization: ${existingOrg.id}`);
    console.log(`Updating clerkOrganizationId to: ${CLERK_ORG_ID}\n`);

    // Update the existing organization with the new Clerk org ID
    await prisma.organization.update({
      where: { id: existingOrg.id },
      data: { clerkOrganizationId: CLERK_ORG_ID },
    });

    console.log("✓ Updated organization with Clerk Organization ID\n");
  } else {
    console.log("No existing organization found. Creating new one...\n");

    await prisma.organization.create({
      data: {
        clerkOrganizationId: CLERK_ORG_ID,
        name: ORGANIZATION_NAME,
      },
    });

    console.log("✓ Created new organization\n");
  }

  console.log("✅ Migration complete!");
  console.log(`   Your data is now associated with Clerk Organization: ${CLERK_ORG_ID}`);
  console.log("\n   Any user who is a member of this Clerk Organization can now access the data.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

